<script setup lang="ts">
defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" class="quiz-cta" @click="$emit('click')">
    <span class="quiz-cta__liquid" aria-hidden="true" />
    <span class="quiz-cta__liquid quiz-cta__liquid--inner" aria-hidden="true" />
    <span class="quiz-cta__shine" aria-hidden="true" />
    <span class="quiz-cta__label">Fazer Quiz</span>
  </button>
</template>

<style scoped>
.quiz-cta {
  position: fixed;
  left: 50%;
  bottom: clamp(84px, 12vh, 128px);
  z-index: 96;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transform: translateX(-50%);
  isolation: isolate;
}

.quiz-cta__liquid {
  position: absolute;
  inset: -10px;
  z-index: -2;
  border-radius: 999px;
  background: conic-gradient(
    from 0deg,
    #ff4d4d,
    #ff9f1a,
    #ffe600,
    #52ff7a,
    #00e0ff,
    #6a5cff,
    #ff4dd2,
    #ff4d4d
  );
  filter: blur(16px) saturate(1.5);
  opacity: 0.85;
  animation: quiz-rainbow 7s linear infinite;
}

.quiz-cta__liquid--inner {
  inset: -4px;
  z-index: -1;
  filter: blur(7px) saturate(1.8);
  opacity: 0.9;
  animation-duration: 4.5s;
  animation-direction: reverse;
}

.quiz-cta__shine {
  position: absolute;
  inset: -14px;
  z-index: -3;
  border-radius: 999px;
  background: radial-gradient(60% 80% at 50% 50%, rgb(255 255 255 / 0.16), transparent 70%);
  animation: quiz-pulse 3.2s ease-in-out infinite;
}

.quiz-cta__label {
  position: relative;
  z-index: 1;
  padding: 12px 30px;
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 999px;
  background: rgb(8 8 12 / 0.86);
  color: #fff;
  font-family: var(--fr-sans, inherit);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 34px rgb(0 0 0 / 0.55);
  transition: transform 0.25s ease, background-color 0.25s ease;
}

.quiz-cta:hover .quiz-cta__label {
  transform: translateY(-1px);
  background: rgb(18 18 26 / 0.92);
}

.quiz-cta:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 4px;
}

.quiz-cta {
  animation: quiz-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes quiz-rainbow {
  to { transform: rotate(360deg); }
}

@keyframes quiz-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@keyframes quiz-enter {
  from { opacity: 0; transform: translateX(-50%) translateY(14px) scale(0.92); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .quiz-cta,
  .quiz-cta__liquid,
  .quiz-cta__liquid--inner,
  .quiz-cta__shine {
    animation: none;
  }
}
</style>
