import pysam

# ===== INPUT FILE (.vcf.gz) =====
vcf_path = "/mnt/c/shikhar(D drive)/D drive/Pharma/dataset/ALL.chr1.phase3_shapeit2_mvncall_integrated_v5b.20130502.genotypes.vcf.gz"

# ===== OUTPUT FILE =====
output_vcf = "DPYD_filtered.vcf"

# ===== CYP2C19 REGION (GRCh37) =====
chrom_number = "1"
start = 97788920
end = 98062016

print("Opening VCF with index...")

vcf_in = pysam.VariantFile(vcf_path)

# ===== Detect chromosome naming =====
available_contigs = list(vcf_in.header.contigs)

if chrom_number in available_contigs:
    chrom = chrom_number
elif f"chr{chrom_number}" in available_contigs:
    chrom = f"chr{chrom_number}"
else:
    raise ValueError(f"Chromosome {chrom_number} not found in VCF contigs")

print(f"Using chromosome name: {chrom}")

# Output file with same header
vcf_out = pysam.VariantFile(output_vcf, 'w', header=vcf_in.header)

count = 0

print(f"Strict filtering region: {chrom}:{start}-{end}")

for record in vcf_in.fetch(chrom, start, end):

    # ===== STRICT CHECK =====
    if record.pos < start or record.pos > end:
        continue

    vcf_out.write(record)
    count += 1

vcf_in.close()
vcf_out.close()

print("Done.")
print(f"Variants found: {count}")
print(f"Saved file: {output_vcf}")