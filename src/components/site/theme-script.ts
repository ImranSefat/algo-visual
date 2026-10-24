/**
 * Runs inline in <head> before first paint so the saved (or system) theme is applied
 * without a flash. Kept out of the client module so the server layout can inline it.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
