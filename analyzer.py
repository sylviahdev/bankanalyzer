import pandas as pd

# Categorize transactions
def categorize(description):
    desc = description.lower()

    if "salary" in desc or "dividend" in desc:
        return "Income"
    elif "uber" in desc or "transport" in desc:
        return "Transport"
    elif "supermarket" in desc or "grocery" in desc:
        return "Groceries"
    elif "restaurant" in desc:
        return "Food"
    elif "electricity" in desc or "bill" in desc:
        return "Bills"
    else:
        return "Other"

def analyze(file_path):
    df = pd.read_csv(file_path)

    # Add category column
    df["Category"] = df["Description"].apply(categorize)

    # Summary
    summary = df.groupby("Category")["Amount"].sum()

    print("\n=== Transaction Summary ===")
    print(summary)

    # ✅ ADD IT HERE
    summary.to_excel("summary.xlsx")
    print("Summary saved to summary.xlsx")

    return summary

# Run test
if __name__ == "__main__":
    analyze("statement.csv")