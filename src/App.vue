<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Layout from "./shared/presentation/components/layout.vue";

const route = useRoute();
// Public routes (IAM segment selection) render without the application shell.
const isPublic = computed(() => route.meta?.public === true);
</script>

<template>
  <router-view v-if="isPublic"/>
  <Layout v-else/>
</template>
