# graph_builder.py
# Member 1 - Data & Road Network Engineer
# Responsibilities: Create road network graph using NetworkX,
# Design road dataset, Add road attributes, Store and load data from CSV

import networkx as nx
import pandas as pd
import os

from console_setup import configure_utf8_output

configure_utf8_output()

# ─────────────────────────────────────────
#  LOAD ROAD DATA FROM CSV
# ─────────────────────────────────────────
def load_roads_from_csv(filepath="data/roads.csv"):
    """
    Load road data from CSV file and return a DataFrame.
    """
    if not os.path.exists(filepath):
        print(f"[ERROR] File not found: {filepath}")
        return None

    df = pd.read_csv(filepath)
    print("\n✅ Road Data Loaded Successfully:")
    print(df.to_string(index=False))
    return df


# ─────────────────────────────────────────
#  BUILD ROAD NETWORK GRAPH
# ─────────────────────────────────────────
def build_road_network(df):
    """
    Build a NetworkX graph from road DataFrame.
    Each road (edge) has attributes: traffic_density,
    road_width, alternative_routes, critical_location_nearby
    """
    G = nx.Graph()

    # Add nodes (intersections)
    nodes = set()
    for _, row in df.iterrows():
        road_id = row["Road_ID"]
        node1 = road_id[0]   # e.g., 'A' from 'AB'
        node2 = road_id[1]   # e.g., 'B' from 'AB'
        nodes.add(node1)
        nodes.add(node2)

    G.add_nodes_from(sorted(nodes))
    print(f"\n✅ Nodes Added: {list(G.nodes())}")

    # Add edges with attributes
    for _, row in df.iterrows():
        road_id  = row["Road_ID"]
        node1    = road_id[0]
        node2    = road_id[1]

        G.add_edge(
            node1,
            node2,
            road_id              = road_id,
            traffic_density      = row["Traffic_Density"],
            road_width           = row["Road_Width"],
            alternative_routes   = row["Alternative_Routes"],
            critical_location    = row["Critical_Location_Nearby"],
            weight               = row["Traffic_Density"]   # weight = congestion
        )
        print(f"   Edge Added: {node1} --[{road_id}]--> {node2} "
              f"| Density={row['Traffic_Density']} | Width={row['Road_Width']}")

    print(f"\n✅ Total Nodes : {G.number_of_nodes()}")
    print(f"✅ Total Edges : {G.number_of_edges()}")
    return G


# ─────────────────────────────────────────
#  DISPLAY GRAPH INFO
# ─────────────────────────────────────────
def display_graph_info(G):
    """
    Display detailed information about the road network graph.
    """
    print("\n" + "="*50)
    print("       ROAD NETWORK GRAPH INFORMATION")
    print("="*50)

    print("\n📍 NODES (Intersections):")
    for node in G.nodes():
        print(f"   - Intersection {node}")

    print("\n🛣️  EDGES (Roads) with Attributes:")
    for u, v, data in G.edges(data=True):
        print(f"\n   Road: {data['road_id']} ({u} ↔ {v})")
        print(f"   ├── Traffic Density      : {data['traffic_density']}")
        print(f"   ├── Road Width           : {data['road_width']} lanes")
        print(f"   ├── Alternative Routes   : {data['alternative_routes']}")
        print(f"   └── Critical Location    : {data['critical_location']}")

    # Basic graph metrics
    print("\n📊 GRAPH METRICS:")
    print(f"   Average Degree   : {sum(dict(G.degree()).values()) / G.number_of_nodes():.2f}")
    print(f"   Is Connected     : {nx.is_connected(G)}")
    print(f"   Graph Density    : {nx.density(G):.4f}")


# ─────────────────────────────────────────
#  SAVE GRAPH TO CSV (Optional Export)
# ─────────────────────────────────────────
def save_graph_to_csv(G, filepath="data/graph_edges.csv"):
    """
    Save graph edges with attributes to a new CSV file.
    """
    rows = []
    for u, v, data in G.edges(data=True):
        rows.append({
            "Node1"              : u,
            "Node2"             : v,
            "Road_ID"           : data["road_id"],
            "Traffic_Density"   : data["traffic_density"],
            "Road_Width"        : data["road_width"],
            "Alternative_Routes": data["alternative_routes"],
            "Critical_Location" : data["critical_location"]
        })

    export_df = pd.DataFrame(rows)
    export_df.to_csv(filepath, index=False)
    print(f"\n✅ Graph edges saved to: {filepath}")


# ─────────────────────────────────────────
#  MAIN (for testing this module alone)
# ─────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("   MEMBER 1 - Data & Road Network Engineer")
    print("=" * 50)

    df = load_roads_from_csv("data/roads.csv")
    if df is not None:
        G = build_road_network(df)
        display_graph_info(G)
        save_graph_to_csv(G)
