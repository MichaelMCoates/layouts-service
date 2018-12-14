import {Context, GenericTestContext} from 'ava';
import {Layout} from '../../../src/client/types';
import {getConnection} from '../../provider/utils/connect';
import {delay} from '../../provider/utils/delay';
import {AppInitializerParams, createAppsArray, createWindowGroupings, TestAppData, WindowGrouping} from './AppInitializer';
import {AppContext} from './createAppTest';
import {sendServiceMessage, sendServiceMessageAwait} from './serviceUtils';

type SaveRestoreTestContext = GenericTestContext<Context<AppContext>>;

async function isWindowActive(uuid: string, name: string) {
    const fin = await getConnection();
    const allWindows = await fin.System.getAllWindows();

    return allWindows.some(win => {
        if (win.uuid !== uuid) {
            return false;
        } else if (uuid === name) {
            return true;
        } else {
            return win.childWindows.some(childWin => childWin.name === name);
        }
    });
}

export async function assertWindowRestored(t: SaveRestoreTestContext, uuid: string, name: string) {
    const active = await isWindowActive(uuid, name);
    active ? t.pass() : t.fail(`Window ${uuid}:${name} was not restored`);
}

export async function assertWindowNotRestored(t: SaveRestoreTestContext, uuid: string, name: string) {
    const active = await isWindowActive(uuid, name);
    active ? t.fail(`Window ${uuid}:${name} was restored when it should not have been`) : t.pass();
}

function assertIsLayoutObject(t: SaveRestoreTestContext, layout: Layout) {
    layout.type === 'layout' ? t.pass() : t.fail('Layout object has an incorrect type!');
}

async function assertAllAppsClosed(t: SaveRestoreTestContext) {
    t.context.testAppData.forEach(async (appData: TestAppData) => {
        const appRunning = await appData.app.isRunning();
        if (appRunning) {
            t.fail(`Application ${appData.uuid} is running, but it should have been closed.`);
            return;
        }
    });
}

export async function createCloseAndRestoreLayout(t: SaveRestoreTestContext) {
    const generatedLayout = await sendServiceMessage('generateLayout', undefined) as Layout;
    assertIsLayoutObject(t, generatedLayout);
    await Promise.all(t.context.testAppData.map(async (appData: TestAppData) => await appData.app.close(true)));
    await assertAllAppsClosed(t);
    await sendServiceMessageAwait('restoreLayout', generatedLayout);
    // To give placeholder windows time to disappear.
    // The tests close out all testing windows upon completion.
    // The placeholders listens to the show-requested event of its testing window, moves the window, shows it, and closes itself.
    // If the tests run too quickly after restore, the placeholder windows may receive the child window show event too late,
    // and the window may not exist, which makes the placeholder windows stay open.
    await delay(300);
}

export interface TestCreationOptions {
    url: string;
    manifest: boolean;
}

export function createBasicSaveAndRestoreTest(
    numAppsToCreate: number, numberOfChildren: number, testOptions?: TestCreationOptions): {apps: AppInitializerParams[]} {
    const appsArray = createAppsArray(numAppsToCreate, numberOfChildren, testOptions);

    return {apps: appsArray as AppInitializerParams[]};
}

export function createSnapTests(numAppsToCreate: number, numberOfChildren: number, testOptions?: TestCreationOptions):
    {apps: AppInitializerParams[], snapWindowGrouping: WindowGrouping}[] {
    const windowGroupings = createWindowGroupings(numAppsToCreate, numberOfChildren);
    const appsArray = createAppsArray(numAppsToCreate, numberOfChildren, testOptions);

    return windowGroupings.map(windowGrouping => {
        return {apps: appsArray as AppInitializerParams[], snapWindowGrouping: windowGrouping};
    });
}

export function createTabTests(
    numAppsToCreate: number, numberOfChildren: number, testOptions?: TestCreationOptions): {apps: AppInitializerParams[], tabWindowGrouping: WindowGrouping}[] {
    const windowGroupings = createWindowGroupings(numAppsToCreate, numberOfChildren);
    const appsArray = createAppsArray(numAppsToCreate, numberOfChildren, testOptions);

    return windowGroupings.map(windowGrouping => {
        return {apps: appsArray as AppInitializerParams[], tabWindowGrouping: windowGrouping};
    });
}