"""
DistriCommerce - Regional Routing Engine
Maps arbitrary customer delivery cities to the configured distributed database regional nodes
(Pune, Delhi, Chennai) with a robust, documented fallback strategy.
"""

from typing import Dict, Any, List

DEFAULT_REGION = "Pune"

# Configured Regional Node Hubs
REGIONAL_HUBS = {
    "Pune": {
        "hub_name": "Western & Central-West Hub",
        "description": "Serves Maharashtra, Gujarat, Madhya Pradesh, Goa and Western territories.",
        "storage_node": "pune_site.db",
        "fragment_table": "orders_pune",
    },
    "Delhi": {
        "hub_name": "Northern & Upper-Central Hub",
        "description": "Serves NCR, Punjab, Haryana, Rajasthan, Uttar Pradesh, Uttarakhand, and Northern territories.",
        "storage_node": "delhi_site.db",
        "fragment_table": "orders_delhi",
    },
    "Chennai": {
        "hub_name": "Southern & Eastern Hub",
        "description": "Serves Tamil Nadu, Karnataka, Telangana, Andhra Pradesh, Kerala, West Bengal, and Eastern territories.",
        "storage_node": "chennai_site.db",
        "fragment_table": "orders_chennai",
    }
}

# Extensive mapping of Indian cities to regional database nodes
CITY_TO_REGION_MAP: Dict[str, str] = {
    # --- PUNE HUB (WESTERN / CENTRAL-WEST) ---
    "pune": "Pune",
    "mumbai": "Pune",
    "nagpur": "Pune",
    "nashik": "Pune",
    "aurangabad": "Pune",
    "chhatrapati sambhajinagar": "Pune",
    "thane": "Pune",
    "navi mumbai": "Pune",
    "kolhapur": "Pune",
    "solapur": "Pune",
    "amravati": "Pune",
    "nanded": "Pune",
    "akola": "Pune",
    "jalgaon": "Pune",
    "dhule": "Pune",
    "chandrapur": "Pune",
    "satara": "Pune",
    "sangli": "Pune",
    "ratnagiri": "Pune",
    "ahmedabad": "Pune",
    "surat": "Pune",
    "vadodara": "Pune",
    "rajkot": "Pune",
    "bhavnagar": "Pune",
    "jamnagar": "Pune",
    "gandhinagar": "Pune",
    "indore": "Pune",
    "bhopal": "Pune",
    "ujjain": "Pune",
    "jabalpur": "Pune",
    "gwalior": "Pune",
    "goa": "Pune",
    "panaji": "Pune",
    "margao": "Pune",
    "vasco": "Pune",

    # --- DELHI HUB (NORTHERN / UPPER-CENTRAL) ---
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "noida": "Delhi",
    "greater noida": "Delhi",
    "gurgaon": "Delhi",
    "gurugram": "Delhi",
    "faridabad": "Delhi",
    "ghaziabad": "Delhi",
    "jaipur": "Delhi",
    "jodhpur": "Delhi",
    "udaipur": "Delhi",
    "kota": "Delhi",
    "bikaner": "Delhi",
    "ajmer": "Delhi",
    "lucknow": "Delhi",
    "kanpur": "Delhi",
    "agra": "Delhi",
    "varanasi": "Delhi",
    "prayagraj": "Delhi",
    "allahabad": "Delhi",
    "meerut": "Delhi",
    "bareilly": "Delhi",
    "aligarh": "Delhi",
    "moradabad": "Delhi",
    "gorakhpur": "Delhi",
    "chandigarh": "Delhi",
    "ludhiana": "Delhi",
    "amritsar": "Delhi",
    "jalandhar": "Delhi",
    "patiala": "Delhi",
    "dehradun": "Delhi",
    "haridwar": "Delhi",
    "roorkee": "Delhi",
    "shimla": "Delhi",
    "dharamshala": "Delhi",
    "srinagar": "Delhi",
    "jammu": "Delhi",
    "patna": "Delhi",
    "gaya": "Delhi",
    "muzaffarpur": "Delhi",

    # --- CHENNAI HUB (SOUTHERN / EASTERN) ---
    "chennai": "Chennai",
    "bengaluru": "Chennai",
    "bangalore": "Chennai",
    "hyderabad": "Chennai",
    "secunderabad": "Chennai",
    "coimbatore": "Chennai",
    "madurai": "Chennai",
    "tiruchirappalli": "Chennai",
    "trichy": "Chennai",
    "salem": "Chennai",
    "tirunelveli": "Chennai",
    "vellore": "Chennai",
    "kochi": "Chennai",
    "cochin": "Chennai",
    "thiruvananthapuram": "Chennai",
    "trivandrum": "Chennai",
    "kozhikode": "Chennai",
    "calicut": "Chennai",
    "thrissur": "Chennai",
    "kollam": "Chennai",
    "visakhapatnam": "Chennai",
    "vizag": "Chennai",
    "vijayawada": "Chennai",
    "guntur": "Chennai",
    "nellore": "Chennai",
    "tirupati": "Chennai",
    "mysuru": "Chennai",
    "mysore": "Chennai",
    "mangaluru": "Chennai",
    "mangalore": "Chennai",
    "hubli": "Chennai",
    "dharwad": "Chennai",
    "belagavi": "Chennai",
    "belgaum": "Chennai",
    "kolkata": "Chennai",
    "calcutta": "Chennai",
    "howrah": "Chennai",
    "durgapur": "Chennai",
    "asansol": "Chennai",
    "siliguri": "Chennai",
    "bhubaneswar": "Chennai",
    "cuttack": "Chennai",
    "rourkela": "Chennai",
    "ranchi": "Chennai",
    "jamshedpur": "Chennai",
    "dhanbad": "Chennai",
    "guwahati": "Chennai",
    "shillong": "Chennai",
}

def resolve_city_region(city_name: str) -> Dict[str, Any]:
    """
    Resolves an arbitrary delivery city to a configured regional database node.
    - If mapped: routes to corresponding hub node (Pune, Delhi, or Chennai).
    - If unmapped / novel city: routes to DEFAULT_REGION (Pune Gateway Node) as documented fallback.
    - The actual user-entered city is ALWAYS preserved for display, receipts, and reporting.
    """
    clean_city = (city_name or "").strip()
    if not clean_city:
        return {
            "input_city": "",
            "normalized_city": "",
            "assigned_region": DEFAULT_REGION,
            "routing_reason": "No city specified; routed to default Primary Gateway Hub (Pune Node)",
            "is_fallback": True,
            "target_fragment": f"orders_{DEFAULT_REGION.lower()}",
            "storage_node": f"{DEFAULT_REGION.lower()}_site.db",
            "hub_info": REGIONAL_HUBS[DEFAULT_REGION]
        }

    norm = clean_city.lower()
    
    # 1. Direct exact match
    if norm in CITY_TO_REGION_MAP:
        region = CITY_TO_REGION_MAP[norm]
        return {
            "input_city": clean_city,
            "normalized_city": norm,
            "assigned_region": region,
            "routing_reason": f"Mapped via {REGIONAL_HUBS[region]['hub_name']}",
            "is_fallback": False,
            "target_fragment": f"orders_{region.lower()}",
            "storage_node": f"{region.lower()}_site.db",
            "hub_info": REGIONAL_HUBS[region]
        }

    # 2. Substring match (e.g. "Navi Mumbai" or "Greater Noida")
    for key, region in CITY_TO_REGION_MAP.items():
        if key in norm or norm in key:
            return {
                "input_city": clean_city,
                "normalized_city": norm,
                "assigned_region": region,
                "routing_reason": f"Matched nearest regional cluster ({REGIONAL_HUBS[region]['hub_name']})",
                "is_fallback": False,
                "target_fragment": f"orders_{region.lower()}",
                "storage_node": f"{region.lower()}_site.db",
                "hub_info": REGIONAL_HUBS[region]
            }

    # 3. Documented Fallback Strategy:
    # Any unfamiliar or international/novel Indian city is assigned to the Pune Primary Gateway Node.
    return {
        "input_city": clean_city,
        "normalized_city": norm,
        "assigned_region": DEFAULT_REGION,
        "routing_reason": f"Unmapped city routed via Primary Regional Gateway Hub ({DEFAULT_REGION} Node)",
        "is_fallback": True,
        "target_fragment": f"orders_{DEFAULT_REGION.lower()}",
        "storage_node": f"{DEFAULT_REGION.lower()}_site.db",
        "hub_info": REGIONAL_HUBS[DEFAULT_REGION]
    }

def get_routing_overview() -> Dict[str, Any]:
    """Returns the routing directory and configuration metadata for API consumers and faculty demo."""
    sample_cities_per_region = {
        "Pune": ["Pune", "Mumbai", "Nagpur", "Nashik", "Ahmedabad", "Surat", "Indore", "Goa"],
        "Delhi": ["Delhi", "New Delhi", "Noida", "Gurgaon", "Jaipur", "Lucknow", "Chandigarh", "Amritsar"],
        "Chennai": ["Chennai", "Bengaluru", "Hyderabad", "Coimbatore", "Kochi", "Kolkata", "Bhubaneswar", "Visakhapatnam"]
    }
    return {
        "default_fallback_region": DEFAULT_REGION,
        "total_mapped_cities": len(CITY_TO_REGION_MAP),
        "hubs": REGIONAL_HUBS,
        "sample_clusters": sample_cities_per_region,
        "fallback_policy": "Any arbitrary city outside configured clusters is routed to the Primary Gateway Hub (Pune Node) while preserving the exact customer delivery city and address."
    }
