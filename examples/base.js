const Resource = require('..');

const sleep = t => new Promise(resolve => setTimeout(resolve, t));

async function taskA() {
    console.log('Task A', Resource.now.id);
}

async function taskB() {
    await sleep(300);
    console.log('Task B', Resource.now.id);
}

async function taskC() {
    await sleep(1000);
    console.log('Task C', Resource.now.id);
}

const main = Resource.wrap(async x => {
    console.log(`Main ${x} start`, Resource.now.id);
    // notice we do not await on taskC, so we need to explicitly
    // add it to the current session
    Resource.addTask(taskC());
    await Promise.all([
        taskA(),
        taskB(),
    ]);
    console.log(`Main ${x} end`, Resource.now.id);
});

main(1);
main(2);