"""When a stay may be reviewed (plan §10.7, bonus B2). The one home of this rule: the
trip page asks it to decide whether to offer the form, and the write checks it again."""

from datetime import date, timedelta

from app.bookings.models import STATUS_CONFIRMED, Booking

# A guest has 14 days after checkout to write a review (REF-R1).
REVIEW_WINDOW_DAYS = 14


def review_error(booking: Booking, today: date) -> tuple[str, str] | None:
    """Why this stay cannot be reviewed today, as (code, message); None when it can.
    Whether it already has a review is a separate question, answered by the database."""
    if booking.status != STATUS_CONFIRMED or booking.check_out > today:
        return "stay_not_completed", "You can review a stay once it has ended."
    if today > booking.check_out + timedelta(days=REVIEW_WINDOW_DAYS):
        return (
            "review_window_closed",
            f"Reviews can be written up to {REVIEW_WINDOW_DAYS} days after checkout.",
        )
    return None
