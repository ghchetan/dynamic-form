/**
 * "Start timer" button — counts time on site into a field (in hours).
 *
 * Config example:
 *   { "id": "siteTimer", "type": "timer", "label": "Start timer", "targetField": "actualHours" }
 *
 * Click once to start, again to pause, again to resume.
 */
export function toggleTimer(form, action, button) {
    const timerId = action.id || 'timer';
    const runningIntervalId = form.timers.get(timerId);

    // Already running → pause it.
    if (runningIntervalId) {
        clearInterval(runningIntervalId);
        form.timers.delete(timerId);
        if (button) button.textContent = 'Resume timer';
        return;
    }

    // Not running → start counting from the hours already in the field.
    let seconds = Math.round(Number(form.getValue(action.targetField) || 0) * 3600);

    const intervalId = setInterval(() => {
        seconds += 1;
        // notify: false → don't fire onFieldChange every second.
        form.setValue(action.targetField, seconds / 3600, { notify: false });
    }, 1000);

    form.timers.set(timerId, intervalId);
    if (button) button.textContent = 'Pause timer';
}
