<script setup lang="ts">
import VersionSwitcher from '@components/VersionSwitcher.vue';

const versions = [
  {
    label: 'Faker 10',
    short: 'v10',
    value: 'v10',
  },
];
</script>

<template>
  <VersionSwitcher :values="versions" default="v10" />
</template>
