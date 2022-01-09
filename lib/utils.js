import { cpus } from 'os'

/**
 * @template T
 * @param {T|null} val
 * @returns {T}
 */
export function mustBeNotNull(val) {
	if (val === null) throw new Error('value is null, this should not happen')
	return val
}

/**
 * @template T
 * @param {T|undefined} val
 * @returns {T}
 */
export function mustBeDefined(val) {
	if (val === undefined) throw new Error('value is undefined, this should not happen')
	return val
}

/** @class */
export function PromisePool() {
	const parallel = cpus().length
	const tasks = /**@type {Promise<unknown>[]}*/ ([])

	// const maxQueueLen = parallel * 4
	// const queue = /**@type {(() => Promise<unknown>)[]}*/ ([])

	/** @param {Promise<unknown>} taskExt */
	function onTaskEnd(taskExt) {
		tasks.splice(tasks.indexOf(taskExt), 1)
		// const queuedTask = queue.shift()
		// if (queuedTask) addNow(queuedTask())
	}

	/** @param {Promise<unknown>} task */
	function addNow(task) {
		const taskExt = task.finally(() => onTaskEnd(taskExt))
		tasks.push(taskExt)
	}

	/** @param {Promise<unknown>} task */
	this.add = async task => {
		while (tasks.length >= parallel) await Promise.race(tasks)
		addNow(task)
	}

	// /** @param {() => Promise<unknown>} delayedTask */
	// this.queue = async delayedTask => {
	// 	while (queue.length >= maxQueueLen && tasks.length > 0) await Promise.race(tasks)
	// 	if (tasks.length < parallel) addNow(delayedTask())
	// 	else queue.push(delayedTask)
	// }

	this.end = () => Promise.all(tasks)
}
