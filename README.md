# Picasso Lab Website

Official website for the **Picasso Lab** at UC San Diego, led by Prof. Yufei Ding. Research focuses on system optimization for machine learning, compilers, and quantum computing.

## Project Structure

```
Picasso-Lab/
├── home/              # Lab homepage
│   └── static/        # Logos, background music, hero assets
├── people/            # Lab members & alumni
│   └── static/        # Member profile photos
├── pub/               # Publications
│   └── pub.html
├── teaching/          # Course pages
│   ├── teaching.html  # Course overview cards
│   └── cse291p.html   # CSE 291P: LLM System Optimization (W26)
├── events/            # Lab events & memories
│   ├── events.html
│   └── static/        # Event photos & videos
├── sponsors/          # Sponsors & funding
│   └── static/        # Sponsor logos
├── blogs/             # Blog posts & external articles
└── .backup/           # Archived / deprecated files
```

## Development

This is a static site -- no build step required. Each section is self-contained in its own directory with co-located static assets.

**To preview locally:**

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

**Static asset convention:** Each directory owns its assets in a local `static/` subfolder. Image/media URLs in HTML use GitHub raw content paths for CDN delivery:

```
https://raw.githubusercontent.com/yil384/Picasso-Lab/main/{section}/static/{file}
```

## Deployment

The site is hosted via GitHub Pages from the `main` branch. Push to `main` to deploy.

## Links

- **Lab website:** [yufeiding.ucsd.edu](https://yufeiding.ucsd.edu)
- **GitHub:** [github.com/yil384/Picasso-Lab](https://github.com/yil384/Picasso-Lab)
