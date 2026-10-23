<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
</script>

<template>
  <div class="home-container">
    <div class="home-left">
      <h1 class="home-title">{{ t('home.title') }}</h1>
      <p class="home-subtitle">{{ t('home.content') }}</p>
    </div>
    <div class="home-right">
      <img
          src="/home-hero.png"
          :alt="t('home.title')"
          class="home-image"
      />
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: calc(100vh - 120px);
  padding: 0 4rem;
  background-color: #F8F9FA;
  gap: 2rem;
}

.home-left {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.home-title {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 3rem;
  color: #1a1a2e;
  margin: 0;
  line-height: 1.15;
}

.home-subtitle {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 1rem;
  color: #475569;
  margin: 0;
  line-height: 1.6;
}

.home-right {
  flex: 0 0 55%;
  display: flex;
  justify-content: flex-end;
}

.home-image {
  width: 100%;
  max-width: 680px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  object-fit: cover;
}
</style>