/* Yelp Hub spokes. Reasoning, including why the permalink and the layout are
   facts about the directory rather than about the file, lives in
   tools/eleventy/article-directory-data.js.

   /yelp/ itself is the hub page and is not built yet. This directory holds its
   spokes, which stand on their own at /yelp/<slug>/ until it exists. */
import articleDirectory from "../../tools/eleventy/article-directory-data.js";

export default articleDirectory("yelp");
