from datetime import date


def count_working_days(start: date, end: date) -> int:
    """Count Mon–Fri days between start and end (inclusive)."""
    count = 0
    current = start
    from datetime import timedelta
    while current <= end:
        if current.weekday() < 5:  # 0=Mon … 4=Fri
            count += 1
        current += timedelta(days=1)
    return count
