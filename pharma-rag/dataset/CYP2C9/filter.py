import pandas as pd

# ======================
# FILE PATHS
# ======================

input_file = r"C:\shikhar(D drive)\D drive\Pharma\dataset\CYP2C19\CYP2C19_star_results.csv"
output_file = r"C:\shikhar(D drive)\D drive\Pharma\dataset\CYP2C19\CYP2C19_star_results_filtered.csv"

# ======================
# LOAD CSV
# ======================

df = pd.read_csv(input_file)

print("Total rows before:", len(df))

# ======================
# REMOVE UNKNOWN DIPLOTYPES
# ======================

df_filtered = df[
    ~df["Diplotype"].str.contains("Unknown", case=False, na=False)
]

print("Total rows after:", len(df_filtered))

# ======================
# SAVE FILE
# ======================

df_filtered.to_csv(output_file, index=False)

print("Filtered file saved to:")
print(output_file)