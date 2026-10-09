<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
}
</script>

<template>
  <div class="terms-page">
    <div class="terms-card">
      <div class="terms-header">
        <button type="button" class="back-btn" :aria-label="t('terms.back')" @click="goBack">
          <i class="pi pi-arrow-left"/> {{ t('terms.back') }}
        </button>
        <div class="brand">
          <img src="/fulltank-logo.png" alt="FullTank" class="logo"/>
          <div>
            <h1 class="title">{{ t('terms.title') }}</h1>
            <p class="subtitle">{{ t('terms.subtitle') }}</p>
          </div>
        </div>
      </div>

      <div class="terms-content">
        <section class="terms-section">
          <h2>{{ t('terms.disclaimer-title') }}</h2>
          <p>{{ t('terms.disclaimer-text') }}</p>
        </section>

        <section class="terms-section">
          <h2>{{ t('terms.privacy-title') }}</h2>
          <p>{{ t('terms.privacy-text') }}</p>
        </section>

        <section class="terms-section">
          <h2>{{ t('terms.payment-title') }}</h2>
          <p>{{ t('terms.payment-text') }}</p>
        </section>

        <section class="terms-section">
          <h2>{{ t('terms.liability-title') }}</h2>
          <p>{{ t('terms.liability-text') }}</p>
        </section>
      </div>

      <div class="terms-footer">
        <p class="academic-badge">
          <i class="pi pi-info-circle"/>
          FullTank Academic Project · Simulation Platform
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terms-page {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2.5rem 1rem;
  font-family: 'Inter', sans-serif;
}
.terms-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  padding: 2.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}
.terms-header {
  border-bottom: 2px solid #eef2f7;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
}
.back-btn {
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 1rem;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all .15s;
}
.back-btn:hover {
  background: #f1f5f9;
  color: #1e3a8a;
}
.brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.logo {
  height: 48px;
  object-fit: contain;
}
.title {
  margin: 0;
  font-size: 1.6rem;
  color: #1a2744;
  font-weight: 800;
}
.subtitle {
  margin: 2px 0 0;
  font-size: 0.9rem;
  color: #64748b;
}
.terms-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.terms-section h2 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: #1e3a8a;
  font-weight: 700;
}
.terms-section p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
  font-size: 0.95rem;
}
.terms-footer {
  border-top: 1px solid #e2e8f0;
  margin-top: 2rem;
  padding-top: 1.25rem;
  text-align: center;
}
.academic-badge {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
