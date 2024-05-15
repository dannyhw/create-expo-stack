import { Toolbox } from 'gluegun/build/types/domain/toolbox';

import { getPackageManager, getPackageManagerRunnerX } from './getPackageManager';
import { AvailablePackages, CliResults } from '../types';
import { copyBaseAssets } from './copyBaseAssets';
import { outro, spinner } from '@clack/prompts';
import { easConfigure } from './runEasConfigure';

export async function printOutput(
  cliResults: CliResults,
  formattedFiles: any[],
  toolbox: Toolbox,
  stylingPackage: AvailablePackages
): Promise<void> {
  const {
    parameters: { options },
    print: { info, success, highlight },
    system
  } = toolbox;

  const { projectName, flags } = cliResults;
  const s = spinner();

  // Output the results to the user

  s.start('Initializing your project...');
  await Promise.all(formattedFiles);
  s.stop('Project initialized!');

  s.start('Copying base assets...');
  await copyBaseAssets(projectName, toolbox);
  s.stop('Base assets copied!');

  // check if npm option is set, otherwise set based on what the system is configure to use
  const packageManager = cliResults.flags.packageManager || getPackageManager(toolbox, cliResults);

  if (!options.noInstall && !flags.noInstall) {
    s.start(`Installing dependencies using ${packageManager}...`);
    // install with yarn or npm i
    await system.spawn(`cd ${projectName} && ${packageManager} install --silent`, {
      shell: true,
      stdio: 'inherit'
    });
    s.stop('Dependencies installed!');

    s.start('Updating Expo to latest version...');

    await system.spawn(`cd ${projectName} && ${packageManager} install --silent expo`, {
      shell: true,
      stdio: ['ignore', 'ignore', 'inherit']
    });

    s.stop('Latest version of Expo installed!');

    s.start('Updating packages to expo compatible versions...');

    await system.spawn(`cd ${projectName} && ${packageManager} expo install`, {
      shell: true,
      stdio: ['ignore', 'ignore', 'inherit']
    });

    s.stop('Packages updated!');

    s.start(`Cleaning up your project...`);
    // format the files with prettier and eslint using installed packages.
    await system.spawn(`cd ${projectName} && ${packageManager} run format`, {
      shell: true,
      // To only show errors https://nodejs.org/api/child_process.html#optionsstdio
      stdio: ['ignore', 'ignore', 'ignore']
    });
    s.stop('Project files formatted!');
  } else {
    const runnerType = getPackageManagerRunnerX(toolbox, cliResults);

    s.start(`No installation found.\nCleaning up your project using ${runnerType}...`);
    // Running prettier using global runners against the template.
    // Use --no-config to prevent using project's config (that may have plugins/dependencies)
    await system.spawn(`${runnerType} prettier "${projectName}/**/*.{json,js,jsx,ts,tsx}" --no-config --write`, {
      shell: true,
      // To only show errors https://nodejs.org/api/child_process.html#optionsstdio
      stdio: ['ignore', 'ignore', 'inherit']
    });
    s.stop('Project files formatted!');
  }

  if (!options.noGit && !flags.noGit) {
    s.start(`Initializing git...`);
    // initialize git repo and add first commit
    // get create expo stack version
    const cesVersion: string = require('../../package.json').version || '2.0.0';
    await system.spawn(
      `cd ${projectName} && git init --quiet && git add . && git commit -m "Initial commit" -m "Generated by create-expo-stack ${cesVersion}" --quiet`,
      {
        shell: true,
        stdio: 'inherit'
      }
    );
    s.stop(`Git initialized!`);
  }

  if (cliResults.flags.eas) {
    await easConfigure(cliResults, packageManager, toolbox);
  }

  //	check if packages includes package with name "supabase"
  if (cliResults.packages.some((pkg) => pkg.name === 'supabase')) {
    success(`\nSuccess! 🎉 Now, here's what's next:`);
    info(``);
    highlight('Head over to https://database.new to create a new Supabase project.');
    info(``);
    highlight(`Get the Project URL and anon key from the API settings:`);
    info(`1. Go to the API settings page in the Dashboard.`);
    info(`2. Find your Project URL, anon, and service_role keys on this page.`);
    info(`3. Copy these keys and paste them into your .env file.`);
    info(`4. Optionally, follow one of these guides to get started with Supabase:`);
    highlight(`https://docs.expo.dev/guides/using-supabase/#next-steps`);
    info(``);
    success(`Once you're done, run the following to get started: `);
    info(``);
  } else if (cliResults.packages.some((pkg) => pkg.name === 'firebase')) {
    success(`\nSuccess! 🎉 Now, here's what's next:`);
    info(``);
    highlight('Head over to https://console.firebase.google.com/ to create a new Firebase project.');
    info(``);
    highlight(`Get the API key and other unique identifiers:`);
    info(`1. Register a web app in your Firebase project:`);
    highlight(`https://firebase.google.com/docs/web/setup#register-app`);
    info(`2. Find your API key and other identifiers.`);
    info(`3. Copy these keys and paste them into your .env file.`);
    info(`4. Optionally, follow one of these guides to get started with Firebase:`);
    highlight(`https://docs.expo.dev/guides/using-firebase/#next-steps`);
    info(``);
    success(`Once you're done, run the following to get started: `);
    info(``);
  } else {
    success('\nSuccess! 🎉 Now, just run the following to get started: ');
    info(``);
  }
  let step = 1;

  const runCommand = 'npm' === packageManager ? `${packageManager} run` : packageManager;

  if (flags.eas) {
    info(`To build for development:`);
    info(``);
    highlight(`${step}. cd ${projectName}`);
    if (options.noInstall) highlight(`${++step}. ${packageManager} install`);
    highlight(`${++step}. eas build --profile=development`);
    highlight(`${++step}. ${runCommand} start`);

    info(``);

    step = 1;

    info(`To create a build to share with others:`);
    info(``);
    highlight(`${step}. cd ${projectName}`);
    if (options.noInstall) highlight(`${++step}. ${packageManager} install`);
    highlight(`${++step}. eas build --profile=preview`);

    info(``);

    info('To add additional ios users:');
    info(``);
    highlight(`eas device:create `);
  } else {
    highlight(`${step}. cd ${projectName}`);
    if (options.noInstall) highlight(`${++step}. ${packageManager} install`);
    if (stylingPackage.name === 'unistyles' || stylingPackage.name === 'nativewindui') {
      highlight(`${++step}. ${runCommand} expo prebuild`);
    }
    highlight(`${++step}. ${runCommand} ios`);
  }
  info(``);

  outro(
    'If you frequently use create expo stack, please consider sponsoring the project ❤️\n- https://github.com/sponsors/danstepanov'
  );
}
