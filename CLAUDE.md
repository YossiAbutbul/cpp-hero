# Cpp Hero: instructions for Claude

The plan and current state live in `README.md` under **Project status**, **How to continue** and **Working notes**. Read those sections first in every session.

When the user says **"continue according to plan"** (or similar), carry out the next unfinished step of "How to continue" in order, without asking again what to do. Use parallel subagents where the plan or briefs call for it. When the step is done, update the README status and plan, commit and push to `main`, and give the user a short TLDR: what's done, and what they must do and how.

Rules:
- Git commits: plain messages. Never add `Co-Authored-By` or any AI attribution lines.
- Never create accounts or enter credentials or keys for the user (Firebase, Vercel, etc.). Give them exact steps instead.
- Downloads (Docker images, large installs) need the user's OK.
- Follow the user preferences listed in the README (short text, "Tell me more", no scrollbars, etc.).
