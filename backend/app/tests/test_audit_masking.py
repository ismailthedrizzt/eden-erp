from app.domains.audit.masking import mask_sensitive_data


def test_audit_masking_hides_tokens() -> None:
    masked = mask_sensitive_data({"access_token": "abc123", "nested": {"secret": "value"}})
    assert masked["access_token"] == "***"
    assert masked["nested"]["secret"] == "***"


def test_audit_masking_masks_email_phone_iban() -> None:
    masked = mask_sensitive_data(
        {
            "email": "person@example.com",
            "phone": "+90 555 123 4567",
            "iban": "TR120006200119000006672315",
        }
    )
    assert masked["email"] == "pe***@example.com"
    assert masked["phone"] == "***4567"
    assert masked["iban"].endswith("2315")
    assert masked["iban"].startswith("*")
