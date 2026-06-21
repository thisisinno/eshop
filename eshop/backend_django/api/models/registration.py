from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Company(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)

    # Business identity
    registration_number = models.CharField(max_length=100, blank=True, null=True)
    tin_number = models.CharField(max_length=100, blank=True, null=True)

    # Contact details
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=30)
    alternative_phone = models.CharField(max_length=30, blank=True, null=True)

    # Location
    country = models.CharField(max_length=100, default="Tanzania")
    region = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    street = models.CharField(max_length=255, blank=True, null=True)
    address_description = models.TextField(blank=True, null=True)

    # Branding
    logo = models.ImageField(upload_to="companies/logos/", blank=True, null=True)
    cover_image = models.ImageField(upload_to="companies/covers/", blank=True, null=True)

    # Platform control
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)

    # Owner/user who manages this company
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="owned_companies",
        blank=True,
        null=True
    )

    # Internal admin notes
    admin_note = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Companies"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1

            while Company.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            self.slug = slug

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CompanyAgreement(models.Model):
    class AgreementStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        TERMINATED = "terminated", "Terminated"

    class CommissionType(models.TextChoices):
        PERCENTAGE = "percentage", "Percentage"
        FIXED = "fixed", "Fixed Amount"
        NONE = "none", "No Commission"

    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name="agreement"
    )

    agreement_title = models.CharField(max_length=255)

    commission_type = models.CharField(
        max_length=20,
        choices=CommissionType.choices,
        default=CommissionType.PERCENTAGE
    )

    commission_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)

    agreement_file = models.FileField(
        upload_to="companies/agreements/",
        blank=True,
        null=True
    )

    terms = models.TextField(blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=AgreementStatus.choices,
        default=AgreementStatus.DRAFT
    )

    signed_by_company = models.BooleanField(default=False)
    signed_by_platform = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_company_agreements",
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.company.name} Agreement"