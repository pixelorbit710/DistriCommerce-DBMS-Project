import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List
from config import REGIONS
from database import get_orders_by_region, get_central_products

def query_regional_partial_aggregate(region: str) -> Dict[str, Any]:
    """
    Subquery executed on a regional partition node:
    Computes local partial sums: SUM(quantity), SUM(total_amount), COUNT(order_id) grouped by product_id.
    """
    start = time.perf_counter()
    orders = get_orders_by_region(region)
    
    product_stats = {}
    for o in orders:
        pid = o["product_id"]
        if pid not in product_stats:
            product_stats[pid] = {
                "product_id": pid,
                "product_name": o.get("product_name", pid),
                "total_quantity": 0,
                "total_sales": 0.0,
                "order_count": 0
            }
        product_stats[pid]["total_quantity"] += int(o["quantity"])
        product_stats[pid]["total_sales"] += float(o["total_amount"])
        product_stats[pid]["order_count"] += 1
        
    duration_ms = (time.perf_counter() - start) * 1000
    
    return {
        "region": region,
        "execution_time_ms": round(duration_ms, 3),
        "product_aggregates": list(product_stats.values()),
        "total_regional_orders": len(orders),
        "total_regional_sales": round(sum(p["total_sales"] for p in product_stats.values()), 2)
    }

def execute_parallel_sales_aggregation() -> Dict[str, Any]:
    """
    Demonstrates Intraoperation Parallelism:
    The global aggregation operation SUM(sales) GROUP BY product_id is partitioned across
    data fragments and executed simultaneously on each regional fragment using worker threads.
    """
    overall_start = time.perf_counter()
    regional_results = {}
    
    # 1. Parallel Execution Phase
    with ThreadPoolExecutor(max_workers=len(REGIONS)) as executor:
        future_to_region = {executor.submit(query_regional_partial_aggregate, reg): reg for reg in REGIONS}
        for future in as_completed(future_to_region):
            reg = future_to_region[future]
            try:
                data = future.result()
                regional_results[reg] = data
            except Exception as e:
                regional_results[reg] = {"region": reg, "error": str(e), "product_aggregates": []}
                
    parallel_duration_ms = (time.perf_counter() - overall_start) * 1000

    # 2. Sequential Execution Comparison (for benchmarking)
    seq_start = time.perf_counter()
    for reg in REGIONS:
        query_regional_partial_aggregate(reg)
    sequential_duration_ms = (time.perf_counter() - seq_start) * 1000

    # 3. Coordinator Merge Phase (Combining Partial Aggregates)
    merge_start = time.perf_counter()
    all_products = {p["product_id"]: p["name"] for p in get_central_products()}
    combined_product_map = {}

    for pid, pname in all_products.items():
        combined_product_map[pid] = {
            "product_id": pid,
            "product_name": pname,
            "total_quantity": 0,
            "total_sales": 0.0,
            "order_count": 0,
            "regional_breakdown": {}
        }

    for reg, res in regional_results.items():
        for p_agg in res.get("product_aggregates", []):
            pid = p_agg["product_id"]
            if pid not in combined_product_map:
                combined_product_map[pid] = {
                    "product_id": pid,
                    "product_name": p_agg["product_name"],
                    "total_quantity": 0,
                    "total_sales": 0.0,
                    "order_count": 0,
                    "regional_breakdown": {}
                }
            combined_product_map[pid]["total_quantity"] += p_agg["total_quantity"]
            combined_product_map[pid]["total_sales"] += p_agg["total_sales"]
            combined_product_map[pid]["order_count"] += p_agg["order_count"]
            combined_product_map[pid]["regional_breakdown"][reg] = {
                "sales": p_agg["total_sales"],
                "orders": p_agg["order_count"]
            }

    # Format numeric values
    final_aggregates = []
    for item in combined_product_map.values():
        item["total_sales"] = round(item["total_sales"], 2)
        final_aggregates.append(item)

    final_aggregates.sort(key=lambda x: x["total_sales"], reverse=True)
    merge_duration_ms = (time.perf_counter() - merge_start) * 1000

    speedup_ratio = round(sequential_duration_ms / max(parallel_duration_ms, 0.001), 2)

    return {
        "execution_mode": "Multithreaded Concurrent Execution (concurrent.futures.ThreadPoolExecutor)",
        "parallel_duration_ms": round(parallel_duration_ms, 2),
        "sequential_duration_ms": round(sequential_duration_ms, 2),
        "merge_duration_ms": round(merge_duration_ms, 3),
        "speedup_ratio": speedup_ratio,
        "regional_partial_aggregates": regional_results,
        "combined_final_aggregates": final_aggregates,
        "theory": {
            "interquery": {
                "title": "Interquery Parallelism",
                "description": "Different independent queries or transactions execute simultaneously on different CPU cores or distinct regional nodes.",
                "example": "Client A in Pune placing an order while Client B in Delhi generates an inventory summary report concurrently."
            },
            "intraquery": {
                "title": "Intraquery Parallelism",
                "description": "A single complex query is decomposed into multiple sub-operations that execute simultaneously across partitioned nodes.",
                "example": "Breaking 'SELECT SUM(sales) FROM orders_global' into concurrent subqueries on orders_pune, orders_delhi, and orders_chennai."
            },
            "intraoperation": {
                "title": "Intraoperation Parallelism",
                "description": "Parallelism within a single relational operator (e.g., parallel scan, parallel hash-join, or parallel sort/sum) across fragmented partitions.",
                "example": "Each regional worker node scans its own local fragment table and calculates a partial SUM() independently."
            },
            "interoperation": {
                "title": "Interoperation Parallelism (Pipelined & Independent)",
                "description": "Different operations within the same query execution tree execute in parallel (pipelining operator streams or concurrent hash table builds).",
                "example": "A join operator begins streaming partial results to the group-by aggregator before the child scan finishes reading all rows."
            }
        }
    }
