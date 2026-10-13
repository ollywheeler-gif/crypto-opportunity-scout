"""Reference state machine for STRAT-007 contraction setup expiry.

This models setup arming/expiry only. It is not a trading or execution simulator.
"""

def advance_setup(armed, age, previous_ratio, current_ratio, threshold=0.70, lifetime=12):
    if not all(isinstance(v, (int, float)) for v in (previous_ratio, current_ratio, threshold)):
        raise ValueError("ratios and threshold must be numeric")
    if threshold <= 0 or lifetime < 1 or age < 0:
        raise ValueError("threshold, lifetime and age are invalid")
    if current_ratio >= threshold:
        return False, 0, False
    if previous_ratio >= threshold and current_ratio < threshold:
        return True, 0, False  # contraction bar arms but cannot itself trigger
    if armed:
        next_age = age + 1
        if next_age > lifetime:
            return False, 0, False
        return True, next_age, True
    return False, 0, False
