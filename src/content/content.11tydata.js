export default {
  eleventyComputed: {
    layout: (data) => {
      const ext = data.page.inputPath.split('.').pop()?.toLowerCase();
      if (ext === 'html') return 'html-page.njk';
      if (ext === 'txt') return 'text.njk';
      return 'markdown.njk';
    },
  },
};
