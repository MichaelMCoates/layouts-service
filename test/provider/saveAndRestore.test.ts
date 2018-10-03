import {test} from 'ava';
import {Application, Fin, Window} from 'hadouken-js-adapter';
import * as robot from 'robotjs';

import {getConnection} from './utils/connect';
import {dragWindowTo} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';
import {Win} from './utils/getWindow';
import {resizeWindowToSize} from './utils/resizeWindowToSize';
import { ChannelClient } from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';
import { isInGroup } from './utils/isInGroup';
import { delay } from './utils/delay';
import { saveRestoreCreateChildWindow } from './utils/workspaces/saveRestoreCreateChildWindow';

let win1: Window, client: ChannelClient, win2: Window, fin: Fin, app1: Application, app2: Application;

let appIdCount = 0;
const getAppName = () => 'test-app-' + appIdCount++;

test.before(async () => {
    fin = await getConnection();
    client = await fin.InterApplicationBus.Channel.connect({ uuid: 'layouts-service' });
});

test.beforeEach(async () => {
});

test.afterEach.always(async () => {
    if (app1 !== undefined) {
        await app1.close();
    }

    if (app2 !== undefined) {
        await app2.close();
    }

    await fin.System.removeAllListeners();
});

test('Programmatic Save and Restore - 1 App', async t => {
    let y: () => void;
    let n: (e: string) => void;
    const p = new Promise((res, rej) => {
        y = res;
        n = rej;
    });

    const app1Name = getAppName();

    app1 = await fin.Application.create({
        uuid: app1Name,
        url: 'http://localhost:1337/test/registeredApp.html',
        name: app1Name,
        mainWindowOptions: {
            autoShow: true,
            saveWindowState: false,
            defaultTop: 100,
            defaultLeft: 100,
            defaultHeight: 200,
            defaultWidth: 200
        }
    });

    const passIfAppCreated = async (event: {topic: string, type: string, uuid: string}) => {
        if (event.uuid === app1.identity.uuid) {
            y();
        }
    };

    await app1.run();

    const generatedLayout = await client.dispatch('generateLayout');

    await app1.close();

    await fin.System.addListener('application-created', passIfAppCreated);

    await client.dispatch('restoreLayout', generatedLayout);

    setTimeout(
        () => {
            n('Too long');
            t.fail();
        }, 
        5000
    );

    await p;
    t.pass();
});

test('Programmatic Save and Restore - 1 App 1 Child', async t => {
    let y: () => void;
    let n: (e: string) => void;
    const p = new Promise((res, rej) => {
        y = res;
        n = rej;
    });

    const passIfWindowCreated = async (event: {topic: string, type: string, uuid: string, name: string}) => {
        if (event.name === 'Child-1 - win0') {
            y();
        }
    };

    await fin.System.addListener('window-created', passIfWindowCreated);

    const app1Name = getAppName();

    app1 = await fin.Application.create({
        uuid: app1Name,
        url: 'http://localhost:1337/test/registeredApp.html',
        name: app1Name,
        mainWindowOptions: {
            autoShow: true,
            saveWindowState: false,
            defaultTop: 100,
            defaultLeft: 100,
            defaultHeight: 200,
            defaultWidth: 200
        }
    });

    await app1.run();

    await saveRestoreCreateChildWindow(app1Name);

    await p;

    const generatedLayout = await client.dispatch('generateLayout');
    
    await app1.close();
    
    await client.dispatch('restoreLayout', generatedLayout);

    setTimeout(
        () => {
            n('Too long');
            t.fail();
        }, 5000
    );

    await p;
    t.pass();
});

test('Programmatic Save and Restore - 2 Snapped Apps', async t => {
    let y: () => void;
    let n: (e: string) => void;
    const p = new Promise((res, rej) => {
        y = res;
        n = rej;
    });
    
    let numAppsRestored = 0;

    const app1Name = getAppName();
    const app2Name = getAppName();
    app1 = await fin.Application.create({
        url: 'http://localhost:1337/test/registeredApp.html',
        uuid: app1Name,
        name: app1Name,
        mainWindowOptions: { autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200 }
    });
    app2 = await fin.Application.create({
        url: 'http://localhost:1337/test/registeredApp.html',
        uuid: app2Name,
        name: app2Name,
        mainWindowOptions: { autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200 }
    });

    const passIfAppsCreated = async (event: { topic: string, type: string, uuid: string }) => {
        if (event.uuid === app1.identity.uuid || event.uuid === app2.identity.uuid) {
            numAppsRestored++;
        }
        if (numAppsRestored === 2) {
            y();
        }
    };

    await app1.run();
    await app2.run();

    win1 = await fin.Window.wrap({ uuid: app1.identity.uuid, name: app1.identity.uuid });
    win2 = await fin.Window.wrap({ uuid: app2.identity.uuid, name: app2.identity.uuid });
    
    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.right + 2, win2Bounds.top + 40);
    await dragWindowTo(win2, 500, 500);
    
    const generatedLayout = await client.dispatch('generateLayout');
    
    await app1.close();
    await app2.close();
    
    await fin.System.addListener('application-created', passIfAppsCreated);
    
    await client.dispatch('restoreLayout', generatedLayout);
    
    await p;
    
    const bounds1 = await getBounds(win1);
    const bounds2 = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.right + 30, win2Bounds.top + 30);

    t.is(bounds1.top, bounds2.top);
    t.is(bounds1.left, bounds2.right);
});

test('Programmatic Save and Restore - 2 Tabbed Apps', async t => {
    let y: () => void;
    let n: (e: string) => void;
    const p = new Promise((res, rej) => {
        y = res;
        n = rej;
    });

    let numAppsRestored = 0;

    const app1Name = getAppName();
    const app2Name = getAppName();
    app1 = await fin.Application.create({
        url: 'http://localhost:1337/test/registeredApp.html',
        uuid: app1Name,
        name: app1Name,
        mainWindowOptions: { autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200 }
    });
    app2 = await fin.Application.create({
        url: 'http://localhost:1337/test/registeredApp.html',
        uuid: app2Name,
        name: app2Name,
        mainWindowOptions: { autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200 }
    });

    const passIfAppsCreated = async (event: { topic: string, type: string, uuid: string }) => {
        if (event.uuid === app1.identity.uuid || event.uuid === app2.identity.uuid) {
            numAppsRestored++;
        }
        if (numAppsRestored === 2) {
            y();
        }
    };

    await app1.run();
    await app2.run();

    win1 = await fin.Window.wrap({ uuid: app1.identity.uuid, name: app1.identity.uuid });
    win2 = await fin.Window.wrap({ uuid: app2.identity.uuid, name: app2.identity.uuid });
    
    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.left, win2Bounds.top);
    
    const generatedLayout = await client.dispatch('generateLayout');
    
    await app1.close();
    await app2.close();
    
    await fin.System.addListener('application-created', passIfAppsCreated);
    
    await client.dispatch('restoreLayout', generatedLayout);
    
    await p;
    
    let bounds1 = await getBounds(win1);
    let bounds2 = await getBounds(win2);

    await delay(1000);
    
    // Move the tab group using the tab strip.
    robot.moveMouse(bounds2.left, bounds2.top);
    robot.moveMouseSmooth(bounds2.left + 10, bounds2.top - 50);
    await delay(500);
    robot.mouseToggle('down');
    
    robot.moveMouseSmooth(bounds2.left + 100, bounds2.top + 100);
    await delay(500);
    robot.mouseToggle('up');
    
    bounds2 = await getBounds(win2);
    
    // Click on both tabs.
    robot.moveMouse(bounds2.left, bounds2.top);
    robot.moveMouseSmooth(bounds2.left + 50, bounds2.top - 25);
    await delay(500);
    robot.mouseClick();
    
    robot.moveMouse(bounds2.left, bounds2.top);
    robot.moveMouseSmooth(bounds2.left + 150, bounds2.top - 25);
    await delay(500);
    robot.mouseClick();
    
    bounds1 = await getBounds(win1);
    bounds2 = await getBounds(win2);

    t.is(bounds1.top, bounds2.top);
    t.is(bounds1.right, bounds2.right);
});


test('Programmatic Save and Restore - Deregistered - 1 App', async t => {
    let y: () => void;
    let n: (e: string) => void;
    const p = new Promise((res, rej) => {
        y = res;
        n = rej;
    });
    
    const app1Name = getAppName();

    app1 = await fin.Application.create({
        uuid: app1Name,
        url: 'http://localhost:1337/test/deregisteredApp.html',
        name: app1Name,
        mainWindowOptions: {
            autoShow: true,
            saveWindowState: false,
            defaultTop: 100,
            defaultLeft: 100,
            defaultHeight: 200,
            defaultWidth: 200
        }
    });

    const failIfAppCreated = async (event: {topic: string, type: string, uuid: string}) => {
        if (event.uuid === app1.identity.uuid) {
            y();
            t.fail();
        }
    };

    await app1.run();

    await delay(500);

    const generatedLayout = await client.dispatch('generateLayout');

    await app1.close();

    await fin.System.addListener('application-created', failIfAppCreated);

    await client.dispatch('restoreLayout', generatedLayout);

    setTimeout(
        () => {
            y();
            t.pass();
        }, 
        2500
    );

    await p;
});

test('Programmatic Save and Restore - Deregistered - 1 App 1 Child', async t => {
    let y: () => void;
    let n: (e: string) => void;
    const p = new Promise((res, rej) => {
        y = res;
        n = rej;
    });
    
    const app1Name = getAppName();
    
    app1 = await fin.Application.create({
        uuid: app1Name,
        url: 'http://localhost:1337/test/deregisteredApp.html',
        name: app1Name,
        mainWindowOptions: {
            autoShow: true,
            saveWindowState: false,
            defaultTop: 100,
            defaultLeft: 100,
            defaultHeight: 200,
            defaultWidth: 200
        }
    });
    
    const failIfWindowCreated = async (event: { topic: string, type: string, uuid: string, name: string }) => {
        if (event.name === 'Child-1 - win0' || event.name === app1Name) {
            y();
            t.fail();
        }
    };
    
    await app1.run();

    await saveRestoreCreateChildWindow(app1Name);

    await delay(1000);
    
    const generatedLayout = await client.dispatch('generateLayout');

    await fin.System.addListener('window-created', failIfWindowCreated);

    await app1.close();

    await client.dispatch('restoreLayout', generatedLayout);

    setTimeout(
        () => {
            y();
            t.pass();
        }, 2500
    );

    await p;
});

test('Programmatic Save and Restore - Deregistered - 2 Snapped Apps', async t => {
    let y: () => void;
    let n: (e: string) => void;
    const p = new Promise((res, rej) => {
        y = res;
        n = rej;
    });

    const app1Name = getAppName();
    const app2Name = getAppName();
    app1 = await fin.Application.create({
        url: 'http://localhost:1337/test/registeredApp.html',
        uuid: app1Name,
        name: app1Name,
        mainWindowOptions: { autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200 }
    });
    app2 = await fin.Application.create({
        url: 'http://localhost:1337/test/deregisteredApp.html',
        uuid: app2Name,
        name: app2Name,
        mainWindowOptions: { autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200 }
    });

    const failIfWindowCreated = async (event: { topic: string, type: string, uuid: string, name: string }) => {
        if (event.name === `Child-1 - win0` || event.name === app2Name) {
            y();
            t.fail();
        }
    };

    await app1.run();
    await app2.run();

    await saveRestoreCreateChildWindow(app2Name);

    await delay(1000);

    win1 = await fin.Window.wrap({ uuid: app1.identity.uuid, name: app1.identity.uuid });
    win2 = await fin.Window.wrap({ uuid: app2Name, name: `Child-1 - win0`});

    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.right + 2, win2Bounds.top + 40);
    await dragWindowTo(win2, 700, 300);

    const generatedLayout = await client.dispatch('generateLayout');

    await app1.close();
    await app2.close();

    await fin.System.addListener('window-created', failIfWindowCreated);

    await client.dispatch('restoreLayout', generatedLayout);

    setTimeout(
        () => {
            y();
            t.pass();
        }, 2500
    );

    await p;
});

test('Programmatic Save and Restore - Deregistered - 2 Tabbed Apps', async t => {
    let y: () => void;
    let n: (e: string) => void;
    const p = new Promise((res, rej) => {
        y = res;
        n = rej;
    });

    const app1Name = getAppName();
    const app2Name = getAppName();
    app1 = await fin.Application.create({
        url: 'http://localhost:1337/test/registeredApp.html',
        uuid: app1Name,
        name: app1Name,
        mainWindowOptions: { autoShow: true, saveWindowState: false, defaultTop: 100, defaultLeft: 100, defaultHeight: 200, defaultWidth: 200 }
    });
    app2 = await fin.Application.create({
        url: 'http://localhost:1337/test/deregisteredApp.html',
        uuid: app2Name,
        name: app2Name,
        mainWindowOptions: { autoShow: true, saveWindowState: false, defaultTop: 300, defaultLeft: 400, defaultHeight: 200, defaultWidth: 200 }
    });

    const failIfWindowCreated = async (event: { topic: string, type: string, uuid: string, name: string }) => {
        if (event.name === `Child-1 - win0` || event.name === app2Name) {
            y();
            t.fail();
        }
    };

    await app1.run();
    await app2.run();

    await saveRestoreCreateChildWindow(app2Name);


    await delay(1000);

    win1 = await fin.Window.wrap({ uuid: app1.identity.uuid, name: app1.identity.uuid });
    win2 = await fin.Window.wrap({ uuid: app2.identity.uuid, name: `Child-1 - win0` });

    const win2Bounds = await getBounds(win2);

    await dragWindowTo(win1, win2Bounds.left, win2Bounds.top);

    const generatedLayout = await client.dispatch('generateLayout');

    await app1.close();
    await app2.close();

    await fin.System.addListener('window-created', failIfWindowCreated);

    await client.dispatch('restoreLayout', generatedLayout);

    setTimeout(
        async () => {
            const options = await win1.getOptions();
            y();
            options.frame ? t.pass() : t.fail();
        }, 2500
    );

    await p;
});