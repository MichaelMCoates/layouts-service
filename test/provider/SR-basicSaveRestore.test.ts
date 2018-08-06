import { test } from 'ava';

import { getConnection } from './utils/connect';
import { dragWindowTo } from './utils/dragWindowTo';
import { getBounds } from './utils/getBounds';
import { Win } from './utils/getWindow';
import { Application, Fin, Window } from 'hadouken-js-adapter';
import * as robot from 'robotjs';
import { resizeWindowToSize } from './utils/resizeWindowToSize';
import { Client } from '../../node_modules/hadouken-js-adapter/out/types/src/api/services/client';
let win1: Window, win2: Window, fin: Fin, app1: Application, app2: Application, saveRestoreClient: Client;

test.before(async () => {
    fin = await getConnection();
    saveRestoreClient = await fin.Service.connect({uuid: 'Layout-Manager'});
});

test.beforeEach(async () => {
    // fin.System.clearCache();
    console.log("In before each");
    // await fin.System.clearCache().then(() => console.log('Cache cleared')).catch(err => console.log(err));
});

test.afterEach.always(async () => {
    
});

test('do nothing', async t => {
    // let layout = await saveRestoreClient.dispatch('getAllLayoutNames');
    // console.log(layout);
    // const v = await fin.System.getVersion();
    // console.log(v);
    let app123 = await fin.Application.createFromManifest('https://demoappdirectory.openf.in/desktop/config/apps/OpenFin/HelloOpenFin/app.json');
    app123.run();


    // console.log("app1", app1);
    // function timeout(ms: number) {
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }
    // // await timeout(1500000);
    // let success = await app1.run();
    // console.log("success", success);
    // await saveRestoreClient.dispatch('saveCurrentLayout', "1");
    // layout = await saveRestoreClient.dispatch('getAllLayoutNames');
    // console.log(layout);



    t.is(true, true);
});