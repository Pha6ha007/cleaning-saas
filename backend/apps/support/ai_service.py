"""
AI Service for Support Chat

Integrates with Anthropic Claude API to provide AI-powered support responses.
Loads product documentation as context for accurate, documentation-based answers.
"""

import os
import logging
from pathlib import Path
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)


class SupportAIService:
    """
    AI service for generating support responses using Anthropic Claude.

    Uses Claude Haiku for fast, cost-effective responses suitable for
    customer support queries.
    """

    def __init__(self):
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.model = "claude-haiku-4-5-20251001"
        self.max_tokens = 1000

    def _load_documentation(self, product: str) -> str:
        """
        Load product documentation files from disk.

        Args:
            product: 'cleaning' or 'maintenance'

        Returns:
            Combined documentation content as string
        """
        base_dir = Path(__file__).resolve().parent.parent.parent

        if product == 'cleaning':
            doc_files = [
                base_dir / "docs" / "product" / "context_cleaning.md",
                base_dir / "docs" / "vision" / "PROOF_PLATFORM_VISION.md",
                base_dir / "MASTER_BRIEF.md",
            ]
        else:
            # maintenance
            doc_files = [
                base_dir / "docs" / "product" / "context_maintenance.md",
                base_dir / "docs" / "vision" / "PROOF_PLATFORM_VISION.md",
                base_dir / "MASTER_BRIEF.md",
            ]

        documentation = []

        for doc_file in doc_files:
            try:
                if doc_file.exists():
                    with open(doc_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        documentation.append(f"# {doc_file.name}\n\n{content}")
                else:
                    logger.warning(f"Documentation file not found: {doc_file}")
            except Exception as e:
                logger.error(f"Error reading documentation file {doc_file}: {e}")
                continue

        return "\n\n---\n\n".join(documentation) if documentation else ""

    def _build_system_prompt(self, product: str, documentation: str) -> str:
        """Build the system prompt with documentation context."""
        if product == "maintenance":
            return f"""You are a support assistant for MaintainProof — a B2B SaaS platform for maintenance and facilities management companies in the UAE.

Your role: help operations managers understand how to use MaintainProof.

Key terminology:
- "Service Visit" = a maintenance job performed by a technician
- "Asset" = physical equipment (HVAC, elevator, electrical panel, etc.)
- "Technician" = field worker who performs service visits
- "Location" = physical site where assets are installed

Rules:
- Answer ONLY based on the documentation provided below
- If you don't know — say "I don't have that information. Please contact support."
- Be concise and friendly
- Use numbered steps when explaining processes
- Do NOT mention technical implementation details
- Do NOT discuss pricing unless asked

DOCUMENTATION:
{documentation}"""
        else:
            # CleanProof (cleaning)
            return f"""You are a support assistant for CleanProof — a B2B SaaS platform for commercial cleaning companies in the UAE.

Your role: help operations managers understand how to use CleanProof.

Rules:
- Answer ONLY based on the documentation provided below
- If you don't know — say "I don't have that information. Please contact support."
- Be concise and friendly
- Use numbered steps when explaining processes
- Do NOT mention technical implementation details
- Do NOT discuss pricing unless asked
- Focus on practical how-to guidance

DOCUMENTATION:
{documentation}"""

    def _format_conversation_history(
        self,
        messages: List[Tuple[str, str]]
    ) -> List[dict]:
        """
        Format message history for Claude API.

        Args:
            messages: List of (role, content) tuples

        Returns:
            List of message dicts for Claude API
        """
        formatted = []
        for role, content in messages:
            formatted.append({
                "role": role,
                "content": content
            })
        return formatted

    def generate_response(
        self,
        product: str,
        user_message: str,
        conversation_history: List[Tuple[str, str]] = None
    ) -> str:
        """
        Generate AI response to user question.

        Args:
            product: 'cleaning' or 'maintenance'
            user_message: User's question
            conversation_history: Previous messages [(role, content), ...]

        Returns:
            AI assistant's response

        Raises:
            Exception: If API call fails or API key missing
        """
        if not self.api_key:
            logger.error("ANTHROPIC_API_KEY not configured")
            return (
                "I'm having trouble right now. Please try again in a moment "
                "or contact support directly."
            )

        try:
            # Lazy import to avoid import errors if anthropic not installed
            import anthropic
        except ImportError:
            logger.error("anthropic package not installed")
            return (
                "I'm having trouble right now. Please try again in a moment "
                "or contact support directly."
            )

        try:
            # Load documentation
            documentation = self._load_documentation(product)
            if not documentation:
                logger.warning(f"No documentation loaded for product: {product}")

            # Build system prompt
            system_prompt = self._build_system_prompt(product, documentation)

            # Format messages
            messages = []
            if conversation_history:
                messages.extend(self._format_conversation_history(conversation_history))

            # Add current user message
            messages.append({
                "role": "user",
                "content": user_message
            })

            # Call Claude API
            client = anthropic.Anthropic(api_key=self.api_key)

            response = client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system_prompt,
                messages=messages
            )

            # Extract text content from response
            if response.content and len(response.content) > 0:
                return response.content[0].text

            return (
                "I'm having trouble generating a response. "
                "Please try again or contact support."
            )

        except Exception as e:
            logger.error(f"Error calling Anthropic API: {e}")
            return (
                "I'm having trouble right now. Please try again in a moment "
                "or contact support directly."
            )


# Singleton instance
_ai_service = None


def get_ai_service() -> SupportAIService:
    """Get or create AI service singleton."""
    global _ai_service
    if _ai_service is None:
        _ai_service = SupportAIService()
    return _ai_service
