import {useState} from 'react';

// A changed review context is unapproved immediately, including the render
// before effects run. Returning to an earlier identity also requires fresh consent.
export default function useDataReviewConsent(context) {
  const [review, setReview] = useState({context, checked: {}});
  if (review.context !== context) {
    setReview({context, checked: {}});
  }
  const checked = review.context === context ? review.checked : {};
  return {
    checked,
    toggle: key =>
      setReview(current => ({
        context,
        checked: {
          ...(current.context === context ? current.checked : {}),
          [key]: !checked[key],
        },
      })),
  };
}
