# simulation.py
# Member 3 - Simulation & Visualization Engineer
# Responsibilities: Perform road closure simulation,
# Analyze impact on the network

import networkx as nx
import pandas as pd

from console_setup import configure_utf8_output

configure_utf8_output()


# ─────────────────────────────────────────
#  ROAD CLOSURE SIMULATION
# ─────────────────────────────────────────
def simulate_road_closure(G, road_to_close):
    """
    Simulate closing a road (removing an edge) and analyze impact.

    Parameters:
        G             : NetworkX graph (road network)
        road_to_close : Road ID string (e.g., "AB")

    Returns:
        impact_report : Dictionary with impact details
    """
    node1 = road_to_close[0]
    node2 = road_to_close[1]

    print(f"\n{'='*55}")
    print(f"  🚧 SIMULATING CLOSURE OF ROAD: {road_to_close} ({node1} ↔ {node2})")
    print(f"{'='*55}")

    # Check if edge exists
    if not G.has_edge(node1, node2):
        print(f"[ERROR] Road {road_to_close} does not exist in the network!")
        return None

    # --- Before closure ---
    original_connected = nx.is_connected(G)
    original_paths     = {}
    all_nodes          = list(G.nodes())

    for src in all_nodes:
        for dst in all_nodes:
            if src != dst:
                try:
                    path = nx.shortest_path(G, src, dst, weight="weight")
                    length = nx.shortest_path_length(G, src, dst, weight="weight")
                    original_paths[(src, dst)] = {"path": path, "length": length}
                except nx.NetworkXNoPath:
                    original_paths[(src, dst)] = {"path": None, "length": float("inf")}

    # --- Remove the road (closure) ---
    G_closed = G.copy()
    G_closed.remove_edge(node1, node2)
    print(f"\n✅ Road {road_to_close} has been CLOSED (edge removed).")

    # --- After closure ---
    closed_connected     = nx.is_connected(G_closed)
    disconnected_pairs   = []
    extra_distance_pairs = []
    affected_roads       = set()

    for src in all_nodes:
        for dst in all_nodes:
            if src != dst:
                try:
                    new_path   = nx.shortest_path(G_closed, src, dst, weight="weight")
                    new_length = nx.shortest_path_length(G_closed, src, dst, weight="weight")

                    old_length = original_paths[(src, dst)]["length"]
                    old_path   = original_paths[(src, dst)]["path"]

                    if new_length > old_length:
                        extra = new_length - old_length
                        extra_distance_pairs.append({
                            "From"          : src,
                            "To"            : dst,
                            "Old_Path"      : " → ".join(old_path),
                            "New_Path"      : " → ".join(new_path),
                            "Extra_Distance": round(extra, 2)
                        })

                        # Mark affected road segments
                        for i in range(len(new_path) - 1):
                            seg = f"{new_path[i]}{new_path[i+1]}"
                            rev = f"{new_path[i+1]}{new_path[i]}"
                            if G.has_edge(new_path[i], new_path[i+1]):
                                road_id = G[new_path[i]][new_path[i+1]].get("road_id", seg)
                                affected_roads.add(road_id)

                except nx.NetworkXNoPath:
                    disconnected_pairs.append(f"{src} ↔ {dst}")

    # --- Build impact report ---
    impact_report = {
        "closed_road"        : road_to_close,
        "was_connected_before": original_connected,
        "is_connected_after" : closed_connected,
        "disconnected_pairs" : disconnected_pairs,
        "extra_distance_pairs": extra_distance_pairs,
        "affected_roads"     : list(affected_roads),
        "graph_closed"       : G_closed
    }

    display_impact_report(impact_report)
    return impact_report


# ─────────────────────────────────────────
#  DISPLAY IMPACT REPORT
# ─────────────────────────────────────────
def display_impact_report(report):
    """
    Print formatted impact report after road closure.
    """
    print("\n📋 IMPACT ANALYSIS REPORT")
    print("-" * 55)

    print(f"\n🚧 Closed Road         : {report['closed_road']}")
    print(f"🔗 Was Connected Before: {report['was_connected_before']}")
    print(f"🔗 Still Connected     : {report['is_connected_after']}")

    # Disconnected Areas
    if report["disconnected_pairs"]:
        print(f"\n⛔ DISCONNECTED AREAS ({len(report['disconnected_pairs'])}):")
        for pair in report["disconnected_pairs"]:
            print(f"   - {pair}")
    else:
        print("\n✅ No areas disconnected (alternative routes exist)")

    # Extra Distance
    if report["extra_distance_pairs"]:
        print(f"\n📏 ROUTES WITH EXTRA DISTANCE ({len(report['extra_distance_pairs'])}):")
        for item in report["extra_distance_pairs"]:
            print(f"\n   {item['From']} → {item['To']}:")
            print(f"   Old Route : {item['Old_Path']}")
            print(f"   New Route : {item['New_Path']}")
            print(f"   Extra     : +{item['Extra_Distance']} units")
    else:
        print("\n✅ No extra distance for any routes")

    # Affected Roads
    if report["affected_roads"]:
        print(f"\n🛣️  AFFECTED ROADS (increased load):")
        for road in report["affected_roads"]:
            print(f"   - Road {road}")

    # Delay Increase Estimate
    total_extra = sum(x["Extra_Distance"]
                      for x in report["extra_distance_pairs"])
    print(f"\n⏱️  ESTIMATED TOTAL DELAY INCREASE : +{total_extra:.2f} units")
    print(f"📊 AFFECTED ROUTE PAIRS            : {len(report['extra_distance_pairs'])}")


# ─────────────────────────────────────────
#  RUN MULTIPLE SIMULATIONS
# ─────────────────────────────────────────
def run_all_simulations(G, roads_list):
    """
    Simulate closure of each road and collect all impact reports.
    """
    all_reports = {}
    for road in roads_list:
        report = simulate_road_closure(G, road)
        if report:
            all_reports[road] = report
    return all_reports


# ─────────────────────────────────────────
#  MAIN (for testing this module alone)
# ─────────────────────────────────────────
if __name__ == "__main__":
    from graph_builder import load_roads_from_csv, build_road_network

    print("=" * 60)
    print("   MEMBER 3 - Simulation & Visualization Engineer")
    print("=" * 60)

    df = load_roads_from_csv("data/roads.csv")
    if df is not None:
        G = build_road_network(df)

        # Simulate closure of the most vulnerable road (AB)
        simulate_road_closure(G, "AB")
