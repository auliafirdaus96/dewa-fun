# BYOK (Bring Your Own Key) Rules

## Principle
A dewa-launchpad agent is "ownerless" in its brain. It uses the user's keys to function.

## Supported Providers
- **Groq (Free Tier Fallback):** Default for new agents.
- **OpenAI / Anthropic (User Provided):** For higher reasoning.
- **DeepSeek / Gemini (optional):** Base on user preference.

## Implementation Standard
- **Encryption:** Keys must be encrypted with a unique per-user salt.
- **No Persistence of Raw Keys:** Only store the encrypted blob.
- **In-Memory Only:** Decrypt only for the duration of the API call.
- **Fallback Logic:** If a user key fails (quota/limit), notify user and fallback to the Groq free tier if configured.

## Activation Strategy (On-Demand BYOK)
- **Launch Phase:** No API Key required. Low friction onboarding.
- **Feature Phase (Social/DLMM):** Users must provide an API Key to activate these autonomous features.
- **Platform Promotion:** Platforms (Dewa.fun) may use their own keys to auto-promote new tokens via Twitter, separate from the user's BYOK settings.
