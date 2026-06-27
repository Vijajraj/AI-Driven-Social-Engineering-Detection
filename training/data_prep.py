import os
import random
import pandas as pd
from pathlib import Path

# Paths
SRC_BASE_DIR = Path(r"C:\Users\vraj1\OneDrive\Documents\Aics dataset")
RAW_DIR = Path("data/raw")
PROCESSED_DIR = Path("data/processed")

RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# ── Lists for Synthetic Data Generation ─────────────────────────────

NAMES = [
    "Alice", "Bob", "Charlie", "David", "Emma", "Frank", "Grace", "Henry", "Ivy", "Jack",
    "Karen", "Leo", "Mia", "Nathan", "Olivia", "Paul", "Rachel", "Sam", "Tina", "Victor",
    "Wendy", "Xavier", "Yolanda", "Zach", "Alex", "Sarah", "John", "Emily", "Michael",
    "Jessica", "David", "Ashley", "James", "Amanda", "Robert", "Melissa", "William",
    "Stephanie", "Joseph", "Nicole", "George", "Mary", "Patricia", "Linda", "Elizabeth",
    "Jennifer", "Susan", "Margaret", "Dorothy", "Lisa", "Nancy", "Karen", "Betty", "Helen"
]

JOB_TITLES = [
    "CEO", "Director", "IT Manager", "HR Generalist", "VP of Operations", "Payroll Lead",
    "Systems Administrator", "Network Engineer", "Security Analyst", "Office Manager",
    "Executive Assistant", "Accountant", "Chief Information Officer", "Project Manager",
    "Compliance Officer", "Technical Support Specialist", "Support Agent", "Scrum Master"
]

DEPARTMENTS = [
    "IT Support", "Helpdesk", "HR Department", "Payroll Team", "Legal Team", "Compliance",
    "Management", "Finance", "Accounting", "Operations", "Information Security",
    "Corporate Communications", "Customer Success", "Internal Audit", "Engineering"
]

BRANDS = [
    "PayPal", "Amazon", "Microsoft", "Apple", "Google", "Netflix", "Facebook", "Instagram",
    "WhatsApp", "Twitter", "Chase Bank", "Wells Fargo", "Citibank", "Bank of America",
    "HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "LinkedIn", "Dropbox", "Slack", "Zoom"
]

SYSTEMS = [
    "VPN", "Active Directory", "corporate email", "Office 365", "Salesforce", "Jira",
    "payroll portal", "HR portal", "Okta dashboard", "AWS console", "GitHub enterprise",
    "internal database", "shared network drive", "accounting software", "CRM portal"
]

PROJECTS = [
    "Sprint Review", "Project Apollo", "Q3 Financials", "Migration 2.0", "System Upgrade",
    "Compliance Audit", "Employee Survey", "Payroll Reconciliation", "Client Database",
    "Security Audit", "API Integration", "Disaster Recovery Plan", "Marketing Campaign"
]

DEADLINES = [
    "immediately", "within 2 hours", "by end of day", "within 24 hours", "before tomorrow morning",
    "ASAP", "by 5 PM", "without delay", "right away", "promptly"
]

PRIZES = [
    "$1,000", "$5,000", "$10,000", "$50,000", "$100,000", "$1,000,000",
    "brand new iPad", "latest iPhone", "Tesla Model 3", "all-expenses-paid vacation"
]

GIFT_CARDS = [
    "Amazon", "Google Play", "Apple Store", "Target", "Walmart", "Steam", "Visa Gift Card"
]

DISCOUNTS = ["50%", "70%", "80%", "90%", "free trial", "exclusive coupon"]

DOMAINS = [
    "alert-secure-service.net", "verify-account-portal.com", "support-desk-update.info",
    "login-security-check.org", "invoice-payment-portal.co", "gift-redemption-center.biz"
]

# ── Templates ──────────────────────────────────────────────────────

IMPERSONATION_TEMPLATES = [
    "Hi {name}, this is {sender_name} from the {department} department. We need you to update your payroll direct deposit information immediately at {url} to avoid any delays in payment. Thanks, {sender_name}.",
    "Hello {name}, I'm trying to reach you regarding the {project} project. Can you please send me the latest client database file or the list of credentials? Thanks, {manager_name}, {job_title}.",
    "Dear customer, {brand} has detected suspicious login activity on your account. Please log in here to verify your identity and protect your funds: {url}",
    "This is IT Support. We are performing an emergency upgrade on the {system}. Please confirm your current username and password at {url} so we can migrate your account details.",
    "Dear employee, this is a notice from the {department} regarding your upcoming performance review. Please view the document and sign off at {url}.",
    "Hey {name}, it's {manager_name}. I'm in a meeting right now and need you to purchase 5 {gift_card} gift cards for a client presentation. Please email the codes to me ASAP. Thanks!",
    "Dear {brand} user, we have updated our terms of service. Failure to accept the new terms by clicking {url} will result in temporary suspension of your services.",
    "Urgent message from {job_title} of {brand}. Please review the attached corporate resolution and confirm your department's compliance at {url}.",
    "Hi {name}, could you wire the transfer of {amount} for invoice #{num} to our new vendor account? Details are at {url}. Approved by {manager_name}.",
    "Hello, this is {sender_name} from {brand} Security Team. We noticed login attempts on your {system} from an unrecognized location. Verify your account now: {url}"
]

URGENCY_TEMPLATES = [
    "URGENT: Your account at {brand} will be suspended in 24 hours unless you verify your credentials immediately at {url}.",
    "Warning! Suspicious access attempt from IP 192.168.1.44 detected on your {system} account. If this was not you, reset your password now to secure it: {url}",
    "Your security key for {brand} expires today. Please update it immediately at {url} to prevent service disruption and lockouts.",
    "NOTICE: Overdue invoice #{num} of {amount} must be settled by end of day today. Click here to make a secure payment and avoid legal action: {url}",
    "Action Required: Your password for {email} expires in 2 hours. Go to {url} to keep your current password and avoid losing access.",
    "CRITICAL ALERT: Your {brand} cloud storage is full and emails are bouncing. Upgrade your plan immediately at {url} or your account will be deactivated.",
    "Final Notice: Court order regarding case #{num} requires your immediate response. Please download the legal documents at {url} within 24 hours.",
    "Your tax refund from HMRC is ready. You must claim it within {deadline} or it will expire: {url}",
    "Attention! Your subscription to {brand} has expired. Reactivate immediately to avoid loss of personal data and files: {url}",
    "EMERGENCY UPDATE: A critical security vulnerability was found in {system}. All employees must run the patch at {url} {deadline}."
]

BAITING_TEMPLATES = [
    "Congratulations! Your email has been selected as the lucky winner of a {prize} cash prize! Claim your reward now by registering here: {url}",
    "You have won a free {gift_card} gift card from {brand}! Click here to receive your redemption code and spend it today: {url}",
    "Exclusive Offer: Get a free {product} by participating in our 2-minute survey. Only 5 slots left! Survey link: {url}",
    "You have a pending inheritance of {amount} from a distant relative. Please contact our claim agent at {email} to initiate the wire transfer.",
    "Get {discount} off your next purchase at {brand}! Claim your coupon code now before it expires: {url}",
    "Thank you for being a loyal customer. We have credited your account with {prize} reward points. Cash them out now: {url}",
    "Earn {amount} weekly from the comfort of your home! No experience required. Sign up for our remote evaluation project at {url}.",
    "Special promotional gift: {brand} is offering a free premium account to the first 500 sign-ups. Get yours now: {url}",
    "Congratulations, you have been selected for a lucky draw to win a {prize}! Join the draw immediately: {url}",
    "Dear user, you have won a {gift_card} voucher from {brand}. Click here to redeem: {url}"
]

PRETEXTING_TEMPLATES = [
    "Hi {name}, I am {sender_name} from the internal audit committee. We are conducting a routine review of {project} access permissions. Could you tell us who currently has admin rights to the {system}?",
    "Hello, this is {sender_name} from the {department}. We are updating the emergency contact sheet for the team. Can you confirm your current phone number and home address?",
    "Dear employee, as part of our compliance initiative, we need to log all software licenses used in the {project} team. Please list the software you currently use and your active license keys.",
    "Hi, I'm the new intern in the {department} department. I was told to ask you for the API credentials for the {system} sandbox environment. Could you email them to me?",
    "Hello, this is {sender_name} from {brand} support. We received a ticket regarding a glitch in your {system} access. To help us troubleshoot, please reply with your username and recent login timestamps.",
    "Hi {name}, I am coordinating the logistics for {project}. We need to verify which file sharing servers you use. Could you provide the IP addresses and login credentials for our audit?",
    "Dear colleague, I am writing a report on {system} usage statistics for {manager_name}. Could you please send me a screenshot of your active sessions list?",
    "Hello, I am {sender_name} from vendor relations. We are validating bank details for our payroll system. Can you provide the current routing and account number for confirmation?",
    "Hi, this is {manager_name}'s assistant. He requested that I compile a list of all team member passwords for the shared {system} account. Please send them over ASAP.",
    "Dear user, this is {brand} billing verification. We need to confirm the billing address on file for your subscription. Please reply with your full billing details."
]

def generate_url():
    brand = random.choice(BRANDS).lower().replace(" ", "")
    domain = random.choice(DOMAINS)
    return f"http://{brand}-{domain}/verify"

def generate_email():
    name = random.choice(NAMES).lower()
    brand = random.choice(BRANDS).lower().replace(" ", "")
    return f"{name}@{brand}-support.com"

def generate_social_eng_dataset():
    """Generate 12,000 synthetic records (3,000 per class) for social engineering."""
    print("Generating synthetic social engineering records...")
    records = []
    
    classes = [
        ("impersonation", IMPERSONATION_TEMPLATES),
        ("urgency_manipulation", URGENCY_TEMPLATES),
        ("baiting", BAITING_TEMPLATES),
        ("pretexting", PRETEXTING_TEMPLATES)
    ]
    
    for label, templates in classes:
        for _ in range(3000):
            template = random.choice(templates)
            
            # Fill placeholders
            text = template.format(
                name=random.choice(NAMES),
                sender_name=random.choice(NAMES),
                manager_name=random.choice(NAMES),
                department=random.choice(DEPARTMENTS),
                brand=random.choice(BRANDS),
                system=random.choice(SYSTEMS),
                project=random.choice(PROJECTS),
                deadline=random.choice(DEADLINES),
                prize=random.choice(PRIZES),
                gift_card=random.choice(GIFT_CARDS),
                discount=random.choice(DISCOUNTS),
                url=generate_url(),
                email=generate_email(),
                amount=f"${random.randint(100, 10000):,}",
                num=random.randint(1000, 99999),
                product=random.choice(["MacBook Pro", "iPad Pro", "Sony Headset", "Gift Voucher"]),
                job_title=random.choice(JOB_TITLES)
            )
            records.append({"text": text, "label": label})
            
    df = pd.DataFrame(records)
    df.to_csv(RAW_DIR / "social_eng.csv", index=False)
    print(f"SUCCESS: Generated {len(df)} social engineering records to data/raw/social_eng.csv")
    return df

# ── Raw Dataset Copying and Extraction ──────────────────────────────

def copy_raw_datasets():
    print("Copying and extracting raw datasets from OneDrive...")
    
    # 1. SMS Spam
    sms_src = SRC_BASE_DIR / "SMS Spam Collection" / "archive (12)" / "spam.csv"
    if not sms_src.exists():
        sms_src = SRC_BASE_DIR / "SMS Spam Collection" / "archive" / "SMSSpamCollection.csv"
    
    if sms_src.exists():
        df_sms = pd.read_csv(sms_src)
        df_sms.to_csv(RAW_DIR / "sms_spam.csv", index=False)
        print(f"SUCCESS: Copied sms_spam.csv ({len(df_sms)} rows)")
    else:
        print("WARNING: SMS Spam source file not found!")

    # 2. Enron Ham (Benign)
    enron_src = SRC_BASE_DIR / "Enron Email Dataset" / "archive (6)" / "labeled_emails.csv"
    if enron_src.exists():
        df_enron = pd.read_csv(enron_src)
        df_ham = df_enron[df_enron["label"] == "ham"].copy()
        df_ham = df_ham.rename(columns={"email": "text"})
        df_ham["label"] = "benign"
        df_ham.to_csv(RAW_DIR / "enron_ham.csv", index=False)
        print(f"SUCCESS: Copied and extracted enron_ham.csv ({len(df_ham)} ham rows)")
    else:
        print("WARNING: Enron source file not found!")

    # 3. Phishing (CEAS Phishing + Fraud Emails)
    phish_src = SRC_BASE_DIR / "Email phising dataset" / "archive (4)" / "Phishing_Email.csv"
    if phish_src.exists():
        df_phish_raw = pd.read_csv(phish_src)
        df_phish = df_phish_raw[df_phish_raw["Email Type"] == "Phishing Email"].copy()
        df_phish = df_phish.rename(columns={"Email Text": "text"})
        df_phish["label"] = "phishing"
        
        # Split into ceas_phishing and fraud_emails
        mid = len(df_phish) // 2
        df_ceas = df_phish.iloc[:mid].copy()
        df_fraud = df_phish.iloc[mid:].copy()
        
        df_ceas.to_csv(RAW_DIR / "ceas_phishing.csv", index=False)
        df_fraud.to_csv(RAW_DIR / "fraud_emails.csv", index=False)
        print(f"SUCCESS: Extracted ceas_phishing.csv ({len(df_ceas)} rows) and fraud_emails.csv ({len(df_fraud)} rows)")
    else:
        print("WARNING: Phishing Email source file not found!")

# ── Unified Dataset Creation ────────────────────────────────────────

def prepare_balanced_dataset():
    print("Building unified, balanced dataset...")
    
    # Load Benign (1500 Enron ham + 1500 SMS ham)
    enron_path = RAW_DIR / "enron_ham.csv"
    sms_path = RAW_DIR / "sms_spam.csv"
    
    if enron_path.exists() and sms_path.exists():
        df_enron = pd.read_csv(enron_path).head(1500)
        df_sms_raw = pd.read_csv(sms_path)
        df_sms = df_sms_raw[df_sms_raw["spamORham"] == "ham"].rename(columns={"Message": "text"}).head(1500)
        df_sms["label"] = "benign"
        df_benign = pd.concat([df_enron, df_sms], ignore_index=True)
    else:
        raise FileNotFoundError("enron_ham.csv or sms_spam.csv not found")

    # Load Phishing
    ceas_path = RAW_DIR / "ceas_phishing.csv"
    if ceas_path.exists():
        df_phishing = pd.read_csv(ceas_path).head(3000)
    else:
        raise FileNotFoundError("ceas_phishing.csv not found")

    # Load generated Social Engineering classes
    social_eng_path = RAW_DIR / "social_eng.csv"
    if not social_eng_path.exists():
        raise FileNotFoundError("social_eng.csv not found")
    df_social = pd.read_csv(social_eng_path)
    
    df_impersonation = df_social[df_social["label"] == "impersonation"].head(3000)
    df_urgency = df_social[df_social["label"] == "urgency_manipulation"].head(3000)
    df_baiting = df_social[df_social["label"] == "baiting"].head(3000)
    df_pretexting = df_social[df_social["label"] == "pretexting"].head(3000)

    # Combine
    dfs = [df_benign, df_phishing, df_impersonation, df_urgency, df_baiting, df_pretexting]
    
    # Ensure they all have only 'text' and 'label' columns
    for i, df in enumerate(dfs):
        dfs[i] = df[["text", "label"]].dropna()

    combined_df = pd.concat(dfs, ignore_index=True)
    
    # Shuffle
    combined_df = combined_df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Output to processed
    combined_df.to_csv(PROCESSED_DIR / "dataset.csv", index=False)
    
    print("\n--- Class Distribution ---")
    print(combined_df["label"].value_counts())
    print(f"\nSUCCESS: Created unified, balanced dataset at {PROCESSED_DIR / 'dataset.csv'}")

if __name__ == "__main__":
    copy_raw_datasets()
    generate_social_eng_dataset()
    prepare_balanced_dataset()
