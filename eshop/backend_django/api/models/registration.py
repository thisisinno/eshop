from django.conf import settings
from django.db import models
from django.utils.text import slugify


class TraderProfile(models.Model):
    class TraderType(models.TextChoices):
        COMPANY = "company", "Company"
        INDIVIDUAL = "individual", "Individual"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    trader_type = models.CharField(max_length=20, choices=TraderType.choices)
    business_name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    owner_full_name = models.CharField(max_length=255, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    tin_number = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50)
    alternative_phone = models.CharField(max_length=50, blank=True)
    country = models.CharField(max_length=100, default="Tanzania")
    region = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    ward = models.CharField(max_length=100, blank=True)
    street = models.CharField(max_length=100, blank=True)
    address_description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="traders/logos/", blank=True, null=True)
    cover_image = models.ImageField(upload_to="traders/covers/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_trader_profiles")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_trader_profiles")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_reason = models.TextField(blank=True)
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("approve_traderprofile", "Can approve trader profile"),
            ("suspend_traderprofile", "Can suspend trader profile"),
        ]

    def save(self, *args, **kwargs):
        base_slug = slugify(self.business_name) or "trader"
        candidate = base_slug
        suffix = 1
        while TraderProfile.objects.exclude(pk=self.pk).filter(slug=candidate).exists():
            candidate = f"{base_slug}-{suffix}"
            suffix += 1
        self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.business_name


class TraderAgreement(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        TERMINATED = "terminated", "Terminated"

    class CommissionType(models.TextChoices):
        PERCENTAGE = "percentage", "Percentage"
        FIXED = "fixed", "Fixed"
        NONE = "none", "None"

    trader = models.OneToOneField(TraderProfile, on_delete=models.CASCADE, related_name="agreement")
    title = models.CharField(max_length=255)
    commission_type = models.CharField(max_length=20, choices=CommissionType.choices, default=CommissionType.NONE)
    commission_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    agreement_file = models.FileField(upload_to="traders/agreements/", null=True, blank=True)
    terms = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    signed_by_trader = models.BooleanField(default=False)
    signed_by_platform = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_trader_agreements")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        permissions = [
            ("activate_traderagreement", "Can activate trader agreement"),
            ("terminate_traderagreement", "Can terminate trader agreement"),
        ]

    @property
    def is_active_agreement(self):
        return self.status == self.Status.ACTIVE and self.signed_by_trader and self.signed_by_platform

    def __str__(self):
        return f"{self.trader} - {self.title}"


class TraderDocument(models.Model):
    class DocumentType(models.TextChoices):
        BUSINESS_LICENSE = "business_license", "Business license"
        TIN_CERTIFICATE = "tin_certificate", "TIN certificate"
        NATIONAL_ID = "national_id", "National ID"
        AGREEMENT = "agreement", "Agreement"
        OTHER = "other", "Other"

    trader = models.ForeignKey(TraderProfile, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="traders/documents/")
    verified = models.BooleanField(default=False)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="uploaded_trader_documents")
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="verified_trader_documents")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title


class TraderBranch(models.Model):
    trader = models.ForeignKey(TraderProfile, on_delete=models.CASCADE, related_name="branches")
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    region = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True)
    ward = models.CharField(max_length=100, blank=True)
    street = models.CharField(max_length=100, blank=True)
    address_description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_main_branch = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Trader Branches"

    def __str__(self):
        return f"{self.trader} - {self.name}"
