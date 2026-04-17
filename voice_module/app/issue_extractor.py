def extract_issue(text: str):
    text = text.lower()
    issues = []

    issue_map = {
        "Delivery Delay": ["late", "delay", "delayed"],
        "Damaged Product": ["broken", "damaged", "defective"],
        "Poor Quality": ["bad quality", "poor quality", "cheap"],
        "Packaging Issue": ["packaging", "box", "package"],
        "Customer Support Issue": ["support", "no response", "rude"]
    }

    for issue, keywords in issue_map.items():
        if any(word in text for word in keywords):
            issues.append(issue)

    if not issues:
        issues.append("General Feedback")

    return issues