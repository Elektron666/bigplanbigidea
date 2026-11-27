// The quote made last on this screen in this visit (job 13): the phone video
// carries its link. In memory only; the visit's end reloads the page.
let last: string | null = null;
export const rememberQuoteToken = (t: string) => {
  last = t;
};
export const lastQuoteToken = () => last;
