import os
import math
from datetime import datetime
import pandas as pd
import re

# =========================
# FILE PATHS
# =========================

sample_vcf = r"C:\shikhar(D drive)\D drive\Pharma\dataset\CYP2D6\z2kiEqb5e2bttDyF.vcf"
pharmvar_folder = r"C:\shikhar(D drive)\D drive\Pharma\dataset\CYP2D6\GRCh37"
output_file = r"C:\shikhar(D drive)\D drive\Pharma\dataset\CYP2D6\CYP2D6_star_results.csv"

drug_name = "Codeine"

# =========================
# ACTIVITY SCORE MAP
# =========================

activity_map = {
    "*1": 1.0, "*2": 1.0,
    "*9": 0.5, "*10": 0.5, "*17": 0.5, "*41": 0.5,
    "*3": 0.0, "*4": 0.0, "*5": 0.0, "*6": 0.0
}

def normalize_chrom(chrom):
    return chrom.replace("chr", "")

def get_activity(allele):
    base_star = allele.split(".")[0]
    return activity_map.get(base_star, 0.5)

def get_phenotype(score):
    if score == 0:
        return "PM"
    elif 0 < score <= 1.0:
        return "IM"
    elif 1.0 < score <= 2.0:
        return "NM"
    else:
        return "UM"

def get_risk(phenotype):
    if phenotype in ["PM", "UM"]:
        return "Toxic", "high"
    elif phenotype == "IM":
        return "Adjust Dosage", "moderate"
    elif phenotype == "NM":
        return "Safe", "low"
    return "Unknown", "unknown"

# =========================
# STEP 1 — LOAD SAMPLE VCF
# =========================

sample_variants = {}
sample_names = []

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

            # Extract ANY rs number from INFO using regex
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

print("Sample variants loaded:", len(sample_variants))

# =========================
# STEP 2 — LOAD PHARMVAR STAR DEFINITIONS
# =========================

star_definitions = {}

for file in os.listdir(pharmvar_folder):
    if file.endswith(".vcf"):
        star_name = file.replace(".vcf", "").replace("CYP2D6_", "*")
        star_definitions[star_name] = []

        with open(os.path.join(pharmvar_folder, file), "r") as f:
            for line in f:
                if not line.startswith("#"):
                    fields = line.strip().split("\t")
                    chrom = normalize_chrom(fields[0])
                    pos = fields[1]
                    ref = fields[3]
                    alt = fields[4]

                    star_definitions[star_name].append((chrom, pos, ref, alt))

print("Loaded star definitions:", len(star_definitions))

# =========================
# STEP 3 — SCIENTIFIC STAR CALLING
# =========================

results = []

for sample_index, sample in enumerate(sample_names):

    star_scores = []
    matched_rsids = []
    matched_positions = []
    matched_chroms = []

    for star, variants in star_definitions.items():

        total_required = len(variants)
        if total_required == 0:
            continue

        match_count = 0
        covered_sites = 0
        contradiction = False

        for chrom, pos, ref, alt in variants:

            key = (chrom, pos)

            if key not in sample_variants:
                continue

            covered_sites += 1
            sample_data = sample_variants[key]

            genotype = sample_data["genotypes"][sample_index].split(":")[0]
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

            if alt in alleles:
                match_count += 1
                matched_rsids.append(sample_data["rsid"])   # ✅ ACTUAL RSID
                matched_positions.append(pos)               # ✅ POSITION
                matched_chroms.append(chrom)                # ✅ CHROM
            elif ref in alleles:
                contradiction = True

        if covered_sites == 0:
            continue

        base_score = match_count / total_required
        coverage_ratio = covered_sites / total_required
        contradiction_penalty = 0.5 if contradiction else 1.0
        variant_weight = math.log(total_required + 1)

        score = base_score * coverage_ratio * contradiction_penalty * variant_weight

        star_scores.append((star, score, total_required))

    star_scores.sort(key=lambda x: x[1], reverse=True)
    top2 = star_scores[:2]

    if not top2 or top2[0][1] == 0:
        diplotype = "Unknown/Unknown"
        activity_score = 0
        phenotype = "Unknown"
        risk_label, severity = "Unknown", "unknown"
        confidence_score = 0
    else:
        star1 = top2[0][0]
        star2 = top2[1][0] if len(top2) > 1 else "Unknown"
        diplotype = f"{star1}/{star2}"

        activity_score = get_activity(star1) + get_activity(star2)
        phenotype = get_phenotype(activity_score)
        risk_label, severity = get_risk(phenotype)

        max_score = top2[0][1]
        max_possible = math.log(top2[0][2] + 1)
        confidence_score = round(max_score / max_possible, 3)

    result_entry = {
        "Sample": sample,
        "Drug": drug_name,
        "Timestamp": datetime.now().isoformat(),
        "Diplotype": diplotype,
        "Activity_Score": activity_score,
        "Phenotype": phenotype,
        "Risk_Label": risk_label,
        "Severity": severity,
        "Confidence_Score": confidence_score,
        "RSIDs": ",".join(set(matched_rsids)),       # ✅ NEW
        "Chromosomes": ",".join(set(matched_chroms)),# ✅ NEW
        "Positions": ",".join(set(matched_positions))# ✅ NEW
    }

    results.append(result_entry)

# =========================
# STEP 4 — SAVE RESULTS
# =========================

pd.DataFrame(results).to_csv(output_file, index=False)

print("Star calling complete.")
print("Saved to:", output_file)
