# main.py
# Entry point - Integrates all three members' modules
# Run this file to execute the complete system

import os
import sys

from console_setup import configure_utf8_output

configure_utf8_output()

# ─────────────────────────────────────────
#  IMPORTS
# ─────────────────────────────────────────
from graph_builder import (
    load_roads_from_csv,
    build_road_network,
    display_graph_info,
    save_graph_to_csv
)
from vulnerability import (
    analyze_vulnerability,
    display_vulnerability_report,
    save_vulnerability_results
)
from simulation import (
    simulate_road_closure,
    run_all_simulations
)
from visualization import (
    plot_network_graph,
    plot_tvi_bar_chart,
    plot_risk_heatmap,
    plot_impact_comparison
)


# ─────────────────────────────────────────
#  BANNER
# ─────────────────────────────────────────
def print_banner():
    print("\n" + "█"*60)
    print("█                                                          █")
    print("█      🚦 TRAFFIC CONGESTION VULNERABILITY SYSTEM 🚦       █")
    print("█                                                          █")
    print("█   Member 1 : Data & Road Network Engineer                █")
    print("█   Member 2 : Vulnerability Analysis Engineer             █")
    print("█   Member 3 : Simulation & Visualization Engineer         █")
    print("█                                                          █")
    print("█"*60 + "\n")


# ─────────────────────────────────────────
#  MENU
# ─────────────────────────────────────────
def show_menu():
    print("\n" + "="*50)
    print("              MAIN MENU")
    print("="*50)
    print("  1️⃣  Load Road Data & Build Network Graph")
    print("  2️⃣  Run Vulnerability Analysis (TVI)")
    print("  3️⃣  Simulate Road Closure")
    print("  4️⃣  Generate All Visualizations")
    print("  5️⃣  Run Full System (All Steps)")
    print("  6️⃣  Exit")
    print("="*50)
    return input("\n  Enter your choice (1-6): ").strip()


# ─────────────────────────────────────────
#  STEP 1: Load Data & Build Graph
# ─────────────────────────────────────────
def step_1_load_and_build():
    print("\n" + "─"*50)
    print("  📂 STEP 1: Loading Road Data & Building Graph")
    print("─"*50)

    df = load_roads_from_csv("data/roads.csv")
    if df is None:
        sys.exit("[FATAL] Cannot load road data. Exiting.")

    G = build_road_network(df)
    display_graph_info(G)
    save_graph_to_csv(G)
    return df, G


# ─────────────────────────────────────────
#  STEP 2: Vulnerability Analysis
# ─────────────────────────────────────────
def step_2_vulnerability(df):
    print("\n" + "─"*50)
    print("  🔍 STEP 2: Running Vulnerability Analysis (TVI)")
    print("─"*50)

    result_df = analyze_vulnerability(df)
    display_vulnerability_report(result_df)
    save_vulnerability_results(result_df)
    return result_df


# ─────────────────────────────────────────
#  STEP 3: Simulation
# ─────────────────────────────────────────
def step_3_simulation(G, df):
    print("\n" + "─"*50)
    print("  🚧 STEP 3: Road Closure Simulation")
    print("─"*50)

    roads = df["Road_ID"].tolist()
    print(f"\n  Available Roads: {', '.join(roads)}")
    road_to_close = input(
        f"\n  Enter Road ID to close (e.g., AB) or press Enter for ALL: "
    ).strip().upper()

    if road_to_close == "":
        print("\n  ▶️  Running simulation for ALL roads...")
        all_reports = run_all_simulations(G, roads)
    elif road_to_close in roads:
        report      = simulate_road_closure(G, road_to_close)
        all_reports = {road_to_close: report} if report else {}
    else:
        print(f"  [ERROR] Road '{road_to_close}' not found!")
        all_reports = {}

    return all_reports


# ─────────────────────────────────────────
#  STEP 4: Visualizations
# ─────────────────────────────────────────
def step_4_visualizations(G, result_df, all_reports=None):
    print("\n" + "─"*50)
    print("  📊 STEP 4: Generating Visualizations")
    print("─"*50)

    print("\n  🖼️  [1/3] Network Graph...")
    plot_network_graph(G, result_df)

    print("\n  📊 [2/3] TVI Bar Chart...")
    plot_tvi_bar_chart(result_df)

    print("\n  🌡️  [3/3] Risk Heatmap...")
    plot_risk_heatmap(result_df)

    if all_reports and len(all_reports) > 1:
        print("\n  📈 [4/4] Impact Comparison Chart...")
        plot_impact_comparison(all_reports)

    print("\n  ✅ All visualizations generated!")


# ─────────────────────────────────────────
#  MAIN LOOP
# ─────────────────────────────────────────
def main():
    print_banner()

    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)

    df         = None
    G          = None
    result_df  = None
    all_reports= {}

    while True:
        choice = show_menu()

        if choice == "1":
            df, G = step_1_load_and_build()

        elif choice == "2":
            if df is None or G is None:
                print("\n  ⚠️  Please run Step 1 first!")
            else:
                result_df = step_2_vulnerability(df)

        elif choice == "3":
            if G is None:
                print("\n  ⚠️  Please run Step 1 first!")
            else:
                all_reports = step_3_simulation(G, df)

        elif choice == "4":
            if G is None or result_df is None:
                print("\n  ⚠️  Please run Steps 1 and 2 first!")
            else:
                step_4_visualizations(G, result_df, all_reports)

        elif choice == "5":
            print("\n  🚀 RUNNING FULL SYSTEM...")
            df, G        = step_1_load_and_build()
            result_df    = step_2_vulnerability(df)
            all_reports  = run_all_simulations(G, df["Road_ID"].tolist())
            step_4_visualizations(G, result_df, all_reports)
            print("\n  ✅ Full system execution complete!")

        elif choice == "6":
            print("\n  👋 Exiting Traffic Congestion System. Goodbye!\n")
            sys.exit(0)

        else:
            print("\n  ❌ Invalid choice. Please enter 1-6.")


if __name__ == "__main__":
    main()
