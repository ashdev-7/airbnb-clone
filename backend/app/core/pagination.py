import math


def total_pages(total: int, page_size: int) -> int:
    return math.ceil(total / page_size)


def offset(page: int, page_size: int) -> int:
    """Rows to skip for a 1-based page number."""
    return (page - 1) * page_size
