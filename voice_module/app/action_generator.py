def generate_action(issues, emotion):
    actions = []

    for issue in issues:
        if issue == "Delivery Delay":
            actions.append("Investigate delivery logistics and improve shipping time")

        elif issue == "Damaged Product":
            actions.append("Check packaging process and initiate refund/replacement")

        elif issue == "Poor Quality":
            actions.append("Review product quality and supplier standards")

        elif issue == "Packaging Issue":
            actions.append("Improve packaging materials and handling process")

        elif issue == "Customer Support Issue":
            actions.append("Train support team and improve response time")

    # Emotion-based escalation
    if emotion.lower() == "angry":
        actions.append("Prioritize this issue and offer compensation")

    if not actions:
        actions.append("Monitor feedback for further insights")

    return actions