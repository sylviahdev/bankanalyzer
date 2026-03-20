import pandas as pd

def analyze(file_path):
    # Try reading with utf-8 first; if it fails, try 'latin1'
    try:
        df = pd.read_csv(file_path, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(file_path, encoding='latin1')

    # Categorize transactions (your existing code)
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

    df["Category"] = df["Description"].apply(categorize)

    summary = df.groupby("Category")["Amount"].sum()

    print("\n=== Transaction Summary ===")
    print(summary)

    # Save summary to Excel
    summary.to_excel("summary.xlsx")
    print("Summary saved to summary.xlsx")

    return summary
# Run test
if __name__ == "__main__":
    analyze("statement.csv")