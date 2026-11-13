<template>
  <span class="badge" :class="`badge--${status}`">{{ label }}</span>
</template>

<script setup lang="ts">
import type { RelicStatus } from '#shared/types/relic'
import { STATUS_LABEL } from '~/utils/relics'

const props = withDefaults(defineProps<{ status?: RelicStatus }>(), { status: 'active' })
const label = computed(() => STATUS_LABEL[props.status])
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  border-radius: 999px;
  border: 1px solid currentColor;
}

.badge::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.badge--active { color: #9ef0c0; }
.badge--silent { color: #f5d58a; }
.badge--lost { color: #ff9a9a; }
</style>
