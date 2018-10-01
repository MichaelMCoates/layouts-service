import {test} from 'ava';
import {Application, Fin, Window} from 'hadouken-js-adapter';
import * as robot from 'robotjs';

import {getConnection} from './utils/connect';
import {dragWindowTo} from './utils/dragWindowTo';
import {getBounds} from './utils/getBounds';
import {Win} from './utils/getWindow';
import {resizeWindowToSize} from './utils/resizeWindowToSize';
import { ChannelClient } from 'hadouken-js-adapter/out/types/src/api/interappbus/channel/client';

let win1: Window, client: ChannelClient, win2: Window, fin: Fin, app1: Application, app2: Application;

let appIdCount = 0;
const getAppName = () => 'test-app-' + appIdCount++;

test.before(async () => {
    fin = await getConnection();
    client = await fin.InterApplicationBus.Channel.connect({ uuid: 'layouts-service' });
});
test.beforeEach(async () => {
    // const app1Name = getAppName();
    // const app2Name = getAppName();
    // app1 = await fin.Application.create({
    //     uuid: app1Name,
    //     name: app1Name,
    //     mainWindowOptions: {
    //         autoShow: true, 
    //         saveWindowState: false, 
    //         defaultTop: 100, 
    //         defaultLeft: 100, 
    //         defaultHeight: 200,
    //         url: 'http://localhost:1337/demo/app4.html',
    //         defaultWidth: 200
    //     }
    // });
    // app2 = await fin.Application.create({
    //     uuid: app2Name,
    //     name: app2Name,
    //     mainWindowOptions: {
    //         autoShow: true,
    //         saveWindowState: false,
    //         defaultTop: 100,
    //         defaultLeft: 100,
    //         defaultHeight: 200,
    //         url: 'http://localhost:1337/demo/app4.html',
    //         defaultWidth: 200
    //     }
    // });

    // await app1.run();
    // await app2.run();

    // win1 = await fin.Window.wrap({uuid: app1.identity.uuid, name: app1.identity.name});
    // win2 = await fin.Window.wrap({uuid: app2.identity.uuid, name: app2.identity.name});
});

test.afterEach.always(async () => {
    if (app1 !== undefined) {
        await app1.close();
    }
    // await app2.close();
    fin.System.removeAllListeners();
});

test('Programmatic Save and Restore - 1 App', async t => {
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

    const generatedLayout = await client.dispatch('generateLayout');

    await app1.close();
    let y: () => void;
    let n: (e: string) => void;
    const p = new Promise((res, rej) => {
        y = res;
        n = rej;
    });

    const passIfAppCreated = async (event: {topic: string, type: string, uuid: string}) => {
        if (event.uuid === app1.identity.uuid) {
            y();
        }
    };

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
        url: 'http://localhost:1337/test/registeredApp-createChild.html',
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

    const passIfAppsCreated = async (event: { topic: string, type: string, uuid: string }) => {
        if (event.uuid === app1.identity.uuid || event.uuid === app2.identity.uuid) {
            numAppsRestored++;
        }
        if (numAppsRestored === 2) {
            y();
        }
    };

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

