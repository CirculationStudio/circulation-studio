/* Everything that is not a Yelp Hub spoke. Reasoning, including why the
   permalink and the layout are facts about the directory rather than about the
   file, lives in tools/eleventy/article-directory-data.js. */
import articleDirectory from "../../tools/eleventy/article-directory-data.js";

export default articleDirectory("library");
