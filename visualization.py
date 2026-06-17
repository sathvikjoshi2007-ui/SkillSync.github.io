# visualization.py
# Member 3 - Simulation & Visualization Engineer
# Responsibilities: Create visualizations and charts
# (Network Graph, TVI Bar Chart, Risk Heatmap)

import networkx as nx
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import pandas as pd

from console_setup import configure_utf8_output

configure_utf8_output()


def finish_plot(output_path, fig):
    """Save a chart and close it so backend runs do not block."""
    plt.tight_layout()
    plt.savefig(output_path, dpi=150,
                bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


# ─────────────────────────────────────────
#  COLOR MAPPING
# ─────────────────────────────────────────
RISK_COLORS = {
    "High"  : "#e74c3c",    # Red
    "Medium": "#f39c12",    # Orange
    "Low"   : "#27ae60"     # Green
}

NODE_COLOR   = "#2980b9"    # Blue
NODE_CLOSED  = "#e74c3c"    # Red for closed road
EDGE_NORMAL  = "#95a5a6"    # Gray
EDGE_CLOSED  = "#e74c3c"    # Red


# ─────────────────────────────────────────
#  HELPER: Get Risk Color
# ─────────────────────────────────────────
def get_risk_color(risk_level_str):
    """
    Extract color based on risk level string.
    """
    if "High"   in risk_level_str: return RISK_COLORS["High"]
    if "Medium" in risk_level_str: return RISK_COLORS["Medium"]
    return RISK_COLORS["Low"]


# ─────────────────────────────────────────
#  PLOT 1: Network Graph with Risk Levels
# ─────────────────────────────────────────
def plot_network_graph(G, result_df, title="Road Network - Risk Levels",
                        closed_road=None):
    """
    Visualize road network graph with edges colored by risk level.

    Parameters:
        G          : NetworkX graph
        result_df  : DataFrame with TVI scores and risk levels
        title      : Plot title
        closed_road: Road ID string to highlight as closed (e.g., "AB")
    """
    # Build risk level lookup from result_df
    risk_lookup = {}
    for _, row in result_df.iterrows():
        risk_lookup[row["Road_ID"]] = row["Risk_Level"]

    fig, ax = plt.subplots(1, 1, figsize=(10, 7))
    fig.patch.set_facecolor("#1a1a2e")
    ax.set_facecolor("#16213e")

    # Fixed node positions (matching the visual)
    pos = {
        "A": (0, 2),
        "B": (2, 3),
        "C": (4, 3),
        "D": (1, 0),
        "E": (3, 1)
    }

    # Edge colors based on risk level
    edge_colors = []
    edge_widths = []
    edge_styles = []

    for u, v, data in G.edges(data=True):
        road_id    = data.get("road_id", f"{u}{v}")
        rev_road   = f"{v}{u}"

        # Check if this is the closed road
        if closed_road and (road_id == closed_road or rev_road == closed_road):
            edge_colors.append(EDGE_CLOSED)
            edge_widths.append(4.0)
            edge_styles.append("dashed")
            continue

        risk = risk_lookup.get(road_id, risk_lookup.get(rev_road, "Low"))
        edge_colors.append(get_risk_color(risk))
        edge_widths.append(3.0 if "High" in risk else 2.0)
        edge_styles.append("solid")

    # Draw edges
    edges = list(G.edges())
    for i, (u, v) in enumerate(edges):
        nx.draw_networkx_edges(
            G, pos,
            edgelist  = [(u, v)],
            edge_color= [edge_colors[i]],
            width     = edge_widths[i],
            style     = edge_styles[i],
            ax        = ax,
            alpha     = 0.9
        )

    # Edge labels (Road ID + TVI)
    edge_labels = {}
    for u, v, data in G.edges(data=True):
        road_id = data.get("road_id", f"{u}{v}")
        tvi_row = result_df[result_df["Road_ID"] == road_id]
        if not tvi_row.empty:
            tvi_score = tvi_row["TVI_Score"].values[0]
            edge_labels[(u, v)] = f"{road_id}\nTVI:{tvi_score}"
        else:
            edge_labels[(u, v)] = road_id

    nx.draw_networkx_edge_labels(
        G, pos,
        edge_labels   = edge_labels,
        font_size     = 8,
        font_color    = "white",
        ax            = ax,
        bbox          = dict(boxstyle="round,pad=0.2",
                             facecolor="#0f3460", alpha=0.7)
    )

    # Draw nodes
    nx.draw_networkx_nodes(
        G, pos,
        node_color = NODE_COLOR,
        node_size  = 800,
        ax         = ax,
        alpha      = 0.95
    )

    # Node labels
    nx.draw_networkx_labels(
        G, pos,
        font_size   = 14,
        font_color  = "white",
        font_weight = "bold",
        ax          = ax
    )

    # Closed road marker
    if closed_road:
        n1, n2 = closed_road[0], closed_road[1]
        if n1 in pos and n2 in pos:
            mid_x = (pos[n1][0] + pos[n2][0]) / 2
            mid_y = (pos[n1][1] + pos[n2][1]) / 2
            ax.text(mid_x, mid_y + 0.15, "❌ CLOSED",
                    ha="center", va="center",
                    fontsize=11, fontweight="bold",
                    color="white",
                    bbox=dict(facecolor=EDGE_CLOSED, alpha=0.8,
                              boxstyle="round,pad=0.3"))

    # Legend
    patches = [
        mpatches.Patch(color=RISK_COLORS["High"],   label="High Risk"),
        mpatches.Patch(color=RISK_COLORS["Medium"], label="Medium Risk"),
        mpatches.Patch(color=RISK_COLORS["Low"],    label="Low Risk"),
    ]
    if closed_road:
        patches.append(mpatches.Patch(color=EDGE_CLOSED,
                                       label=f"Closed: {closed_road}",
                                       linestyle="dashed"))

    ax.legend(handles=patches, loc="upper left",
              facecolor="#0f3460", labelcolor="white",
              framealpha=0.8, fontsize=10)

    ax.set_title(title, fontsize=14, fontweight="bold",
                 color="white", pad=15)
    ax.axis("off")
    finish_plot("data/network_graph.png", fig)
    print("✅ Network graph saved: data/network_graph.png")


# ─────────────────────────────────────────
#  PLOT 2: TVI Score Bar Chart
# ─────────────────────────────────────────
def plot_tvi_bar_chart(result_df):
    """
    Create a bar chart showing TVI scores for all roads,
    colored by risk level.
    """
    fig, ax = plt.subplots(figsize=(10, 6))
    fig.patch.set_facecolor("#1a1a2e")
    ax.set_facecolor("#16213e")

    roads  = result_df["Road_ID"].tolist()
    scores = result_df["TVI_Score"].tolist()
    colors = [get_risk_color(r) for r in result_df["Risk_Level"].tolist()]

    bars = ax.bar(roads, scores, color=colors,
                  edgecolor="white", linewidth=1.2,
                  width=0.5, zorder=3)

    # Value labels on bars
    for bar, score in zip(bars, scores):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 1.5,
            f"{score}",
            ha="center", va="bottom",
            fontsize=12, fontweight="bold",
            color="white"
        )

    # Risk threshold lines
    ax.axhline(y=70, color=RISK_COLORS["High"],
               linestyle="--", linewidth=1.5, alpha=0.7,
               label="High Risk Threshold (70)")
    ax.axhline(y=40, color=RISK_COLORS["Medium"],
               linestyle="--", linewidth=1.5, alpha=0.7,
               label="Medium Risk Threshold (40)")

    # Grid
    ax.yaxis.grid(True, linestyle="--", alpha=0.3, color="white", zorder=0)
    ax.set_axisbelow(True)

    # Styling
    ax.set_xlabel("Road ID", fontsize=12, color="white", labelpad=10)
    ax.set_ylabel("TVI Score (0-100)", fontsize=12, color="white", labelpad=10)
    ax.set_title("Traffic Vulnerability Index (TVI) - Bar Chart",
                 fontsize=14, fontweight="bold", color="white", pad=15)
    ax.set_ylim(0, 110)
    ax.tick_params(colors="white", labelsize=11)
    ax.spines["bottom"].set_color("white")
    ax.spines["left"].set_color("white")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    # Legend
    patches = [
        mpatches.Patch(color=RISK_COLORS["High"],   label="High Risk"),
        mpatches.Patch(color=RISK_COLORS["Medium"], label="Medium Risk"),
        mpatches.Patch(color=RISK_COLORS["Low"],    label="Low Risk"),
    ]
    ax.legend(handles=patches, loc="upper right",
              facecolor="#0f3460", labelcolor="white",
              framealpha=0.8, fontsize=10)

    finish_plot("data/tvi_bar_chart.png", fig)
    print("✅ TVI bar chart saved: data/tvi_bar_chart.png")


# ─────────────────────────────────────────
#  PLOT 3: Risk Heatmap (Optional)
# ─────────────────────────────────────────
def plot_risk_heatmap(result_df):
    """
    Create a heatmap showing risk attributes for each road.
    """
    # Select numeric columns for heatmap
    heatmap_df = result_df[["Road_ID", "Traffic_Density",
                             "Alternative_Routes",
                             "Road_Width", "TVI_Score"]].copy()
    heatmap_df = heatmap_df.set_index("Road_ID")

    # Normalize to 0-1 for visualization
    norm_df = (heatmap_df - heatmap_df.min()) / \
              (heatmap_df.max() - heatmap_df.min())

    fig, ax = plt.subplots(figsize=(10, 6))
    fig.patch.set_facecolor("#1a1a2e")
    ax.set_facecolor("#16213e")

    # Create heatmap using imshow
    cmap = plt.cm.RdYlGn_r   # Red = high risk, Green = low risk
    im   = ax.imshow(norm_df.values, cmap=cmap, aspect="auto",
                     vmin=0, vmax=1)

    # Labels
    ax.set_xticks(range(len(norm_df.columns)))
    ax.set_xticklabels(
        ["Traffic\nDensity", "Alternative\nRoutes",
         "Road\nWidth", "TVI\nScore"],
        color="white", fontsize=10
    )
    ax.set_yticks(range(len(norm_df.index)))
    ax.set_yticklabels(norm_df.index, color="white", fontsize=12,
                        fontweight="bold")

    # Cell annotations (show actual values)
    for i, road in enumerate(heatmap_df.index):
        for j, col in enumerate(heatmap_df.columns):
            val = heatmap_df.loc[road, col]
            ax.text(j, i, f"{val:.0f}",
                    ha="center", va="center",
                    fontsize=11, fontweight="bold",
                    color="white")

    # Colorbar
    cbar = plt.colorbar(im, ax=ax, shrink=0.8)
    cbar.set_label("Risk Level\n(Normalized)", color="white", fontsize=10)
    cbar.ax.yaxis.set_tick_params(color="white")
    plt.setp(cbar.ax.yaxis.get_ticklabels(), color="white")

    ax.set_title("Road Risk Heatmap - All Attributes",
                 fontsize=14, fontweight="bold", color="white", pad=15)

    # Grid lines
    for i in range(len(norm_df.index) + 1):
        ax.axhline(i - 0.5, color="white", linewidth=0.5, alpha=0.3)
    for j in range(len(norm_df.columns) + 1):
        ax.axvline(j - 0.5, color="white", linewidth=0.5, alpha=0.3)

    finish_plot("data/risk_heatmap.png", fig)
    print("✅ Risk heatmap saved: data/risk_heatmap.png")


# ─────────────────────────────────────────
#  PLOT 4: Impact Comparison Chart
# ─────────────────────────────────────────
def plot_impact_comparison(all_reports):
    """
    Compare impact (extra distance + disconnected pairs)
    for different road closures.
    """
    roads           = []
    total_extras    = []
    disconnected    = []

    for road_id, report in all_reports.items():
        roads.append(road_id)
        total_extra = sum(x["Extra_Distance"]
                          for x in report["extra_distance_pairs"])
        total_extras.append(total_extra)
        disconnected.append(len(report["disconnected_pairs"]))

    x   = np.arange(len(roads))
    w   = 0.35

    fig, ax1 = plt.subplots(figsize=(11, 6))
    fig.patch.set_facecolor("#1a1a2e")
    ax1.set_facecolor("#16213e")

    bars1 = ax1.bar(x - w/2, total_extras, w,
                    label="Extra Distance",
                    color="#e74c3c", alpha=0.85,
                    edgecolor="white")

    ax2   = ax1.twinx()
    bars2 = ax2.bar(x + w/2, disconnected, w,
                    label="Disconnected Pairs",
                    color="#f39c12", alpha=0.85,
                    edgecolor="white")

    # Styling
    ax1.set_xlabel("Road Closed", fontsize=12, color="white")
    ax1.set_ylabel("Total Extra Distance", fontsize=12, color="#e74c3c")
    ax2.set_ylabel("Disconnected Node Pairs", fontsize=12, color="#f39c12")
    ax1.set_title("Road Closure Impact Comparison",
                  fontsize=14, fontweight="bold", color="white")
    ax1.set_xticks(x)
    ax1.set_xticklabels(roads, color="white", fontsize=12)
    ax1.tick_params(axis="y", labelcolor="#e74c3c")
    ax2.tick_params(axis="y", labelcolor="#f39c12")
    ax1.yaxis.grid(True, linestyle="--", alpha=0.2, color="white")

    for spine in ["top"]:
        ax1.spines[spine].set_visible(False)

    lines   = [bars1, bars2]
    labels  = ["Extra Distance", "Disconnected Pairs"]
    ax1.legend(lines, labels, loc="upper right",
               facecolor="#0f3460", labelcolor="white",
               framealpha=0.8, fontsize=10)

    finish_plot("data/impact_comparison.png", fig)
    print("✅ Impact comparison chart saved: data/impact_comparison.png")


# ─────────────────────────────────────────
#  MAIN (for testing this module alone)
# ─────────────────────────────────────────
if __name__ == "__main__":
    from graph_builder  import load_roads_from_csv, build_road_network
    from vulnerability  import analyze_vulnerability
    from simulation     import run_all_simulations

    print("=" * 60)
    print("   MEMBER 3 - Visualization Engineer")
    print("=" * 60)

    df        = load_roads_from_csv("data/roads.csv")
    G         = build_road_network(df)
    result_df = analyze_vulnerability(df)
    roads     = df["Road_ID"].tolist()

    plot_network_graph(G, result_df)
    plot_tvi_bar_chart(result_df)
    plot_risk_heatmap(result_df)

    all_reports = run_all_simulations(G, roads)
    plot_impact_comparison(all_reports)
