<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Layout from './shared/presentation/components/layout.vue';

const route = useRoute();
const isPublic = computed(() => route.meta.public === true);
</script>

<template>
  <router-view v-if="isPublic" />
  <Layout v-else />
</template>
