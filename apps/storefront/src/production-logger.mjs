// Astro's supported logger destination. Free-form framework messages can contain
// request URLs, capabilities, filesystem paths and exception stacks.
export default function productionLogger() {
  return {
    write(event) {
      if (!['info', 'warn', 'error'].includes(event.level)) return;
      const record = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: event.level,
        event: 'astro_framework_' + event.level,
      });
      if (event.level === 'error') console.error(record);
      else console.info(record);
    },
  };
}
