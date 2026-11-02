import math

def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

def bbox(lat, lng, radius_km):
    """Cheap pre-filter box so SQL can use the (lat,lng) index before exact Haversine."""
    dlat = radius_km / 111.0
    dlng = radius_km / (111.0 * max(0.01, math.cos(math.radians(lat))))
    return lat - dlat, lat + dlat, lng - dlng, lng + dlng
