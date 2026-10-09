import os
import math
from datetime import datetime
import pandas as pd
import re

# =========================
# FILE PATHS (MULTIPLE VCFs)
# =========================

sample_vcfs = [
    r"C:\shikhar(D drive)\D drive\Pharma\dataset\DPYD\HKggDl7mabBMxHpK.vcf",
    r"C:\shikhar(D drive)\D drive\Pharma\dataset\DPYD\y8gPLrhsVPchuUVu.vcf"
]

output_file = r"C:\shikhar(D drive)\D drive\Pharma\dataset\DPYD\DPYD_tegafur_results.csv"

drug_name = "Tegafur"

# =========================
# FUNCTIONS
# =========================

def normalize_chrom(chrom):
    return chrom.replace("chr", "").strip()

def get_phenotype(score):
    if score >= 2.5:
        return "UM"
    elif 1.5 <= score < 2.5:
        return "NM"
    elif 1.0 <= score < 1.5:
        return "IM"
    elif score < 1.0:
        return "PM"
    else:
        return "Unknown"

# =========================
# DRUG-SPECIFIC RISK (TEGAFUR)
# =========================

def get_risk(phenotype):
    if phenotype == "PM":
        return "Severe toxicity risk – Avoid tegafur", "high"
    
    elif phenotype == "IM":
        return "Increased toxicity risk – Start with reduced dose of tegafur", "moderate"
    
    elif phenotype == "NM":
        return "Standard dosing of tegafur", "low"
    
    elif phenotype == "UM":
        return "Potential reduced efficacy – Monitor therapeutic response", "moderate"
    
    return "Unknown", "unknown"

# =========================
# DPYD RSID DEFINITIONS
# =========================

dpyd_variants = {
    "rs3918290": ("*2A", 0.0),
    "rs55886062": ("*13", 0.0),
    "rs67376798": ("c.2846A>T", 0.5),
    "rs75017182": ("HapB3", 0.5)
}

# =========================
# MAIN PROCESS
# =========================

results = []

for sample_vcf in sample_vcfs:

    sample_variants = {}
    sample_names = []

    # ---------- LOAD VCF ----------
    with open(sample_vcf, "r") as f:
        for line in f:

            if line.startswith("#CHROM"):
                header = line.strip().split("\t")
                sample_names = header[9:]

            elif not line.startswith("#"):

                fields = line.strip().split("\t")

                chrom = normalize_chrom(fields[0])
                pos = fields[1]
                info_field = fields[7]

                rsid = "."
                match = re.search(r'rs\d+', info_field)
                if match:
                    rsid = match.group(0)

                ref = fields[3]
                alt_list = fields[4].split(",")

                key = (chrom, pos)

                sample_variants[key] = {
                    "rsid": rsid,
                    "ref": ref,
                    "alts": alt_list,
                    "genotypes": fields[9:]
                }

    print(f"Loaded {len(sample_variants)} variants from:", sample_vcf)

    # ---------- PROCESS EACH SAMPLE ----------
    for sample_index, sample in enumerate(sample_names):

        matched_rsids_all = set()
        matched_positions_all = set()
        matched_chroms_all = set()

        detected_variants = []
        allele_scores = [1.0, 1.0]
        allele_idx = 0

        for key, sample_data in sample_variants.items():

            rsid = sample_data["rsid"]

            if rsid not in dpyd_variants:
                continue

            genotype_field = sample_data["genotypes"][sample_index]
            genotype = genotype_field.split(":")[0]

            if genotype in ["./.", ".", ""]:
                continue

            ref_base = sample_data["ref"]
            alt_bases = sample_data["alts"]

            alleles = []

            for gt in genotype.replace("|", "/").split("/"):

                if gt == "0":
                    alleles.append(ref_base)

                elif gt.isdigit() and int(gt) > 0:

                    idx = int(gt) - 1

                    if idx < len(alt_bases):
                        alleles.append(alt_bases[idx])

            variant_name, activity = dpyd_variants[rsid]

            if any(a != ref_base for a in alleles):

                detected_variants.append(variant_name)

                matched_rsids_all.add(rsid)
                matched_positions_all.add(key[1])
                matched_chroms_all.add(key[0])

                if allele_idx < 2:
                    allele_scores[allele_idx] = activity
                    allele_idx += 1

        # ---------- BUILD OUTPUT ----------
        if detected_variants:
            if len(detected_variants) == 1:
                diplotype = f"*1/{detected_variants[0]}"
            else:
                diplotype = f"{detected_variants[0]}/{detected_variants[1]}"
        else:
            diplotype = "*1/*1"

        activity_score = sum(allele_scores)
        phenotype = get_phenotype(activity_score)
        risk_label, severity = get_risk(phenotype)

        confidence_score = round(len(detected_variants) / len(dpyd_variants), 3)

        result_entry = {
            "Sample": f"{os.path.basename(sample_vcf)}::{sample}",
            "Drug": drug_name,
            "Timestamp": datetime.now().isoformat(),
            "Diplotype": diplotype,
            "Activity_Score": activity_score,
            "Phenotype": phenotype,
            "Risk_Label": risk_label,
            "Severity": severity,
            "Confidence_Score": confidence_score,
            "RSIDs": ",".join(matched_rsids_all),
            "Chromosomes": ",".join(matched_chroms_all),
            "Positions": ",".join(matched_positions_all)
        }

        results.append(result_entry)

# =========================
# SAVE RESULTS
# =========================

df = pd.DataFrame(results)
df.to_csv(output_file, index=False)

print("Tegafur DPYD processing complete.")
print("Saved to:", output_file)