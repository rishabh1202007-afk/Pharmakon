import sys
import pandas as pd
import torch
import torch.nn as nn
import joblib
import os
import difflib

# =========================
# DEVICE
# =========================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# =========================
# MODEL (MATCH TRAINING)
# =========================
class RobustModel(nn.Module):
    def __init__(self, vocab_size, num_genes, num_drugs, num_classes):
        super().__init__()

        self.rsid_embed = nn.Embedding(vocab_size + 1, 64, padding_idx=0)
        self.gene_embed = nn.Embedding(num_genes + 1, 16)
        self.drug_embed = nn.Embedding(num_drugs + 1, 16)

        self.fc = nn.Sequential(
            nn.Linear(64 + 16 + 16, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )

    def forward(self, rsids, gene, drug):
        rs = self.rsid_embed(rsids)

        # IMPORTANT: same as training
        rs = rs.mean(dim=1)

        g = self.gene_embed(gene)
        d = self.drug_embed(drug)

        x = torch.cat([rs, g, d], dim=1)
        return self.fc(x)


# =========================
# RSID → GENE MAP
# =========================
rsid_to_gene = {
    "rs4244285": "CYP2C19",
    "rs1799853": "CYP2C9",
    "rs1057910": "CYP2C9",
    "rs9923231": "VKORC1",
    "rs3892097": "CYP2D6",
    "rs3918290": "DPYD",
    "rs8175347": "UGT1A1",
    "rs1799930": "NAT2"
}


# =========================
# NORMALIZER
# =========================
def normalize_input(user_input, valid_options, name="Input"):
    user_input = user_input.strip()

    for opt in valid_options:
        if user_input.lower() == opt.lower():
            return opt

    match = difflib.get_close_matches(user_input, valid_options, n=1, cutoff=0.6)
    if match:
        print(f"\n⚠️ Did you mean '{match[0]}'?")
        if input("Use this? (y/n): ").lower() == "y":
            return match[0]

    print(f"\n❌ Invalid {name}. Allowed:", list(valid_options))
    sys.exit()


# =========================
# TOKENIZER (MATCH TRAINING)
# =========================
def tokenize(x):
    return [i.strip().lower() for i in str(x).split(",")]


# =========================
# VCF → DATAFRAME
# =========================
def vcf_to_dataframe(vcf_path, drug_encoder, gene_encoder):

    rsids = []

    with open(vcf_path) as f:
        for line in f:
            if line.startswith("#"):
                continue

            parts = line.strip().split()
            if len(parts) < 3:
                continue

            rsid = parts[2].lower().strip()
            rsids.append(rsid)

    print("\nRaw RSIDs:", rsids)

    # =========================
    # AUTO GENE DETECT
    # =========================
    detected_genes = set()
    valid_genes = set(gene_encoder.classes_)

    for r in rsids:
        if r in rsid_to_gene:
            g = rsid_to_gene[r]
            if g in valid_genes:
                detected_genes.add(g)

    if not detected_genes:
        detected_genes = valid_genes

    auto_gene = list(detected_genes)[0]

    print("\nDetected Genes:", detected_genes)
    print("Auto-selected:", auto_gene)

    print("\nAvailable Drugs:", list(drug_encoder.classes_))
    print("Available Genes:", list(gene_encoder.classes_))

    drug = normalize_input(input("\nEnter Drug: "), drug_encoder.classes_, "Drug")

    if input("Override gene? (y/n): ").lower() == "y":
        gene = normalize_input(input("Enter Gene: "), gene_encoder.classes_, "Gene")
    else:
        gene = auto_gene

    return rsids, gene, drug


# =========================
# PREDICT
# =========================
def predict(vcf_path, model_path, encoders_path):

    label_encoder = joblib.load(encoders_path + "\\label.pkl")
    drug_encoder = joblib.load(encoders_path + "\\drug.pkl")
    gene_encoder = joblib.load(encoders_path + "\\gene.pkl")
    rsid_vocab = joblib.load(encoders_path + "\\rsid_vocab.pkl")

    model = RobustModel(
        len(rsid_vocab),
        len(gene_encoder.classes_),
        len(drug_encoder.classes_),
        len(label_encoder.classes_)
    ).to(device)

    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    rsids_list, gene_input, drug_input = vcf_to_dataframe(vcf_path, drug_encoder, gene_encoder)

    print("\n===== VARIANTS =====")
    for i, r in enumerate(rsids_list, 1):
        print(f"{i}. {r}")

    rsids = [rsid_vocab.get(r, 0) for r in rsids_list][:20]
    rsids += [0] * (20 - len(rsids))

    gene = torch.tensor(gene_encoder.transform([gene_input]), dtype=torch.long).to(device)
    drug = torch.tensor(drug_encoder.transform([drug_input]), dtype=torch.long).to(device)
    rsids = torch.tensor([rsids], dtype=torch.long).to(device)

    with torch.no_grad():
        out = model(rsids, gene, drug)
        probs = torch.softmax(out, dim=1)
        pred = torch.argmax(probs, dim=1).item()

    label = label_encoder.inverse_transform([pred])[0]
    confidence = probs[0][pred].item()

    print("\n===== RESULT =====")
    print("Predicted Risk:", label)
    print("Confidence:", round(confidence, 4))


# =========================
# MAIN
# =========================
if __name__ == "__main__":

    print("\n===== VCF PREDICTION TOOL =====")

    vcf_path = input("Enter VCF path: ").strip().strip('"')

    model_path = r"C:\shikhar(D drive)\D drive\Pharma\trained models\robust_with_val\best_fold_1.pth"
    encoders_path = r"C:\shikhar(D drive)\D drive\Pharma\trained models\robust_with_val"

    if not os.path.exists(vcf_path):
        print("❌ File not found")
        sys.exit()

    predict(vcf_path, model_path, encoders_path)