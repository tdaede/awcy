import { Dispatcher } from "flux";

export var AppDispatcher = new Dispatcher<Action>();
export class Action { }
export class SelectJob extends Action {
  constructor(public job: Job) {
    super();
  }
}
export class DeselectJob extends Action {
  constructor(public job: Job) { super(); }
}
export class CancelJob extends Action {
  constructor(public job: Job) { super(); }
}
export class SubmitJob extends Action {
  constructor(public job: Job) { super(); }
}
export class AnalyzeFile extends Action {
  constructor(public decoderUrl: string, public fileUrl: string) { super(); }
}

import { Promise } from "es6-promise";
import { AsyncEvent } from 'ts-events';
declare var tinycolor: any;

export let baseUrl = window.location.origin + '/';
export let analyzerReportBaseUrl = baseUrl + "/analyzer.html";
export let analyzerBaseUrl = "/analyzer.html";
var inMockMode = false;

export function formatDate(date) {
  return date.toISOString();
}
export function shallowEquals(a, b): boolean {
  if (a === b) return true;
  let aKeys = Object.keys(a);
  let bKeys = Object.keys(b);
  if (aKeys.length != bKeys.length) return false;
  return aKeys.every(key => {
    if (!(key in b)) {
      return false;
    }
    if (a[key] !== b[key]) return false;
    return true;
  });
}

function zip<T>(a: string[], b: T[], ignoreNull = true): { [index: string]: T } {
  let o = {};
  for (let i = 0; i < a.length; i++) {
    let hasNull = a[i] === null || b[i] === null;
    if (!hasNull || !ignoreNull) o[a[i]] = b[i];
  }
  return o;
}

export function postXHR(path: string, o: any): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    let pairs = [];
    for(let name in o) {
      let value = o[name];
      if (typeof value === "boolean") {
        pairs.push(encodeURIComponent(name) + '=' + value);
      } else if (value) {
        pairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
      }
    }
    let data = pairs.join('&').replace(/%20/g, '+');
    xhr.open('POST', path);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.addEventListener('load', function(event) {
      console.info(data + " " + xhr.response);
      resolve(xhr.status === 200);
    });
    xhr.addEventListener('error', function(event) {
      console.error(data + " " + xhr.response);
      reject(false);
    });
    if (inMockMode) return;
    xhr.send(data);
  });
}

export function loadXHR2<T>(path: string, type = "json"): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    let self = this;
    xhr.open("GET", path, true);
    xhr.responseType = "text";
    xhr.send();

    xhr.addEventListener("load", function () {
      if (xhr.status != 200) {
        console.error("Failed to load XHR: " + path);
        reject();
        return;
      }
      console.info("Loaded XHR: " + path);
      let response = this.responseText;
      resolve(response);
    });
  });
}

export function loadXHR(path: string, next: (json: any) => void, fail: () => void = null, type = "json") {
  let xhr = new XMLHttpRequest();
  let self = this;
  xhr.open("GET", path, true);
  xhr.responseType = "text";
  xhr.send();

  xhr.addEventListener("load", function () {
    if (xhr.status != 200) {
      console.error("Failed to load XHR: " + path);
      fail && fail();
      return;
    }
    console.info("Loaded XHR: " + path);
    let response = this.responseText;
    if (type === "json") {
      response = response.replace(/NaN/g, "null");
      response = response.replace(/-Infinity/g, "null");
      response = response.replace(/Infinity/g, "null");
      try {
        response = response ? JSON.parse(response) : null;
      } catch (x) {
        response = null;
      }
    }
    next(response);
  });
}

export function fileExists(url: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    let self = this;
    xhr.open("HEAD", url, true);
    xhr.send();
    xhr.addEventListener("load", function () {
      if (xhr.status != 404) {
        resolve(true);
      }
      resolve(false);
    });
  });
}

export function daysSince(date: Date) {
  var oneSecond = 1000;
  var oneMinute = 60 * oneSecond;
  var oneHour = 60 * oneMinute;
  var oneDay = 24 * oneHour;
  let diff = new Date().getTime() - date.getTime();
  return Math.round(Math.abs(diff / oneDay));
}

export function secondsSince(date: Date) {
  var oneSecond = 1000;
  let diff = new Date().getTime() - date.getTime();
  return Math.round(Math.abs(diff / oneSecond));
}

export function minutesSince(date: Date) {
  var oneSecond = 1000;
  var oneMinute = 60 * oneSecond;
  let diff = new Date().getTime() - date.getTime();
  return Math.round(Math.abs(diff / oneMinute));
}

export function timeSince(date: Date) {
  var oneSecond = 1000;
  var oneMinute = 60 * oneSecond;
  var oneHour = 60 * oneMinute;
  var oneDay = 24 * oneHour;
  let diff = Math.abs(new Date().getTime() - date.getTime());
  var days = Math.floor(diff / oneDay);
  var hours = Math.floor((diff % oneDay) / oneHour);
  var minutes = Math.floor((diff % oneHour) / oneMinute);
  var seconds = Math.floor((diff % oneMinute) / oneSecond);
  let s = [];
  if (days > 0) {
    s.push(`${days} day${days === 1 ? "" : "s"}`);
  }
  if (hours > 0) {
    s.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }
  if (minutes > 0) {
    s.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }
  if (diff < oneMinute) {
    s.push(`${seconds} second${seconds === 1 ? "" : "s"}`)
  }
  return s.join(", ") + " ago";
}

export enum JobStatus {
  None          = 0,
  Unknown       = 1,
  New           = 2,
  Failed        = 4,
  Running       = 8,
  Building      = 16,
  Waiting       = 32,
  Canceled      = 64,
  Completed     = 128,
  BuildFailed   = 256,
  All           = Running | Building | Completed | New | Failed | Waiting | Completed | Canceled | Unknown | BuildFailed,
  Active        = New | Running | Building | Waiting,
  NotCompleted  = All & ~Completed,
  Cancelable    = New | Running | Building | Waiting
}

export enum ReportField {
  Q,
  Pixels,
  Size,
  PSNR_Y,
  PSNR_HVS,
  SSIM,
  FAST_SSIM,
  CIEDE_2000,
  PSNR_Cb,
  PSNR_Cr,
  APSNR_Y,
  APSNR_Cb,
  APSNR_Cr,
  MSSSIM,
  Time
}

export type Report = { [name: string]: number[][] };

export type BDRateReportJSON = {
  metric_names: string[],
  error_strings: string[],
  average: {
    [index: string]: number
  },
  metric_data: {
    [name: string]: {
      [index: string]: number
    }
  },
  categories: {
    [name: string]: {
      [index: string]: number
    }
  }
};

export class BDRateReport {
  a: Job;
  b: Job;
  average: { [name: string]: number }
  metrics: {
    [video: string]: {
      [name: string]: number
    }
  };
  categories: {
    [category: string]: {
      [name: string]: number
    }
  };
  metricNames: string [];
  error_strings: string [];
  static fromJSON(a: Job, b: Job, json: BDRateReportJSON): BDRateReport {
    function toMap(data: { [index: string]: number }, names: string[]) {
      return zip(names, names.map((name, i) => data[i]))
    }
    let report = new BDRateReport();
    let names = json.metric_names.map((name) => {
      switch (name) {
        case "CIEDE2000": return "CIEDE 2000";
        case "PSNRHVS": return "PSNR HVS";
        case "MSSSIM": return "MS SSIM";
      }
      return name;
    });
    report.a = a;
    report.b = b;
    report.average = toMap(json.average, names);
    report.metrics = { };
    let videos = [];
    for (let k in json.metric_data) {
      videos.push(k);
    }
    videos.sort();
    videos.forEach((video) => {
      report.metrics[video] = toMap(json.metric_data[video], names)
    });
    report.categories = { };
    let categories = [];
    for (let k in json.categories) {
      categories.push(k);
    }
    categories.sort();
    categories.forEach((category) => {
      report.categories[category] = toMap(json.categories[category], names)
    });
    report.metricNames = names;
    report.error_strings = json.error_strings;
    return report;
  }
}

export let metricNames = [
  "PSNR Y", "PSNR HVS", "SSIM", "FAST SSIM", "CIEDE 2000",
  "PSNR Cb", "PSNR Cr", "APSNR Y", "APSNR Cb", "APSNR Cr",
  "MS SSIM", "Encoding Time", "VMAF_old", "Decoding Time",
  "PSNR Y (libvmaf)", "PSNR Cb (libvmaf)", "PSNR Cr (libvmaf)",
  "CIEDE2000 (libvmaf)", "SSIM (libvmaf)", "MS-SSIM (libvmaf)",
  "PSNR-HVS Y (libvmaf)", "PSNR-HVS Cb (libvmaf)", "PSNR-HVS Cr (libvmaf)",
  "PSNR-HVS (libvmaf)", "VMAF", "VMAF-NEG",
  "APSNR Y (libvmaf)", "APSNR Cb (libvmaf)", "APSNR Cr (libvmaf)"
];

export let outFileFieldNames = [
  "Q", "Pixels", "Size"
].concat(metricNames);

export let reportDisplayedMetrics = [ "Encoding Time", "Decoding Time",
  "PSNR Y (libvmaf)", "PSNR Cb (libvmaf)", "PSNR Cr (libvmaf)",
  "CIEDE2000 (libvmaf)", "SSIM (libvmaf)", "MS-SSIM (libvmaf)",
  "PSNR-HVS Y (libvmaf)", "PSNR-HVS Cb (libvmaf)", "PSNR-HVS Cr (libvmaf)",
  "PSNR-HVS (libvmaf)", "VMAF", "VMAF-NEG",
  "APSNR Y (libvmaf)", "APSNR Cb (libvmaf)", "APSNR Cr (libvmaf)"
];

export let reportFieldNames = [
  "Q", "Pixels", "Size"
].concat(reportDisplayedMetrics);

export function metricNameToReportFieldIndex(name: string) {
  return 3 + metricNames.indexOf(name);
}

function parseBoolean(v) {
  if (typeof v === "string") {
    return v == "on" || v == "true";
  }
  return !!v;
}

export class JobProgress {
  constructor(
    public value: number,
    public total: number,
    public eta: number ) {
    // ...
  }
}
export class Job {
  codec: string = "";
  commit: string = "";
  buildOptions: string = "";
  extraOptions: string = "";
  nick: string = "";
  qualities: string = "";
  id: string = "";
  task: string = "";
  taskType: string = "";
  runABCompare: boolean = false;
  saveEncodedFiles: boolean = false;
  status: JobStatus = JobStatus.Unknown;
  date: Date;

  progress: JobProgress = new JobProgress(0, 0, 0);
  selected: boolean = false;
  selectedName: string = "";
  color: string = "";
  onChange = new AsyncEvent<string>();

  log: string = "";
  onLogChange = new AsyncEvent<string>();

  constructor() {

  }

  logInterval: any;

  startPollingLog() {
    if (this.logInterval) {
      clearInterval(this.logInterval);
    }
    this.logInterval = setInterval(() => {
      this.loadLog(true);
    }, 10000);
  }

  loadLog(refresh = false): Promise<string> {
    if (this.log && !refresh) {
      return Promise.resolve(this.log);
    }
    let path = baseUrl + `runs/${this.id}/output.txt`;
    return loadXHR2<string>(path, "text").then((log) => {
      this.log = log;
      this.onLogChange.post("");
    }).catch(() => {
      this.log = "";
      this.onLogChange.post("");
    }) as any;
  }

  loadFile(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      loadXHR(path, (text) => {
        resolve(text);
      }, () => resolve(null), "text");
    });
  }

  loadFiles(paths: string[]): Promise<string[]> {
    return Promise.all(paths.map(path => this.loadFile(path)));
  }


  report: Report = null;

  convex_hulls:  { [name: string]: number[][] } = null;

  totalReportUrl(): string {
    return baseUrl + `runs/${this.id}/${this.task}/total.out`;
  }

  reportUrl(name: string): string {
    return baseUrl + `runs/${this.id}/${this.task}/${name}-daala.out`
  }

  decoderUrl(): string {
    if (this.codec == 'rav1e' || this.codec == 'svt-av1' || this.codec == 'av1') {
      return 'https://media.xiph.org/analyzer/inspect.js';
    } else {
      return baseUrl + `runs/${this.id}/js/decoder.js`;
    }
  }

  ivfUrlPrefix() {
    return baseUrl + `runs/${this.id}/${this.task}/`;
  }
  ivfUrlName(name: string, quality: number) {
    if (this.codec.substring(0,3) == 'av2') {
      return `${name}-${quality}.obu`;
    } else {
      return `${name}-${quality}.ivf`;
    }
  }
  ivfUrl(name: string, quality: number) {
    return this.ivfUrlPrefix() + this.ivfUrlName(name, quality);
  }

  analyzerIvfUrl(name: string, quality: number) {
    return analyzerBaseUrl + `?decoder=${this.decoderUrl()}&file=${this.ivfUrl(name, quality)}`;
  }

  analyzerReportIvfUrl(name: string, quality: number) {
    return analyzerReportBaseUrl + `?decoder=${this.decoderUrl()}&file=${this.ivfUrl(name, quality)}`;
  }

  libvmafXmlUrl(name: string, quality: number) {
    return this.ivfUrlPrefix() + `${name}-${quality}-libvmaf.xml`;
  }

  stdoutUrl(name: string, quality: number) {
    return this.ivfUrlPrefix() + `${name}-${quality}-stdout.txt`;
  }

  stderrUrl(name: string, quality: number) {
    return this.ivfUrlPrefix() + `${name}-${quality}-stderr.txt`;
  }

  loadReport(): Promise<{ [name: string]: any }> {
    if (this.report) {
      return Promise.resolve(this.report);
    }

    // Total Report
    let names = ["Total"];
    let paths = [this.totalReportUrl()];

    // File Report
    names = names.concat(Job.sets[this.task].sources);
    paths = paths.concat(Job.sets[this.task].sources.map(name => {
      // TODO: Fix -daala suffix.
      return this.reportUrl(name);
    }));
    return this.loadFiles(paths).then(textArray => {
      function parse(text) {
        if (text === null) return null;
        return text.split("\n").filter(line => !!line).map(line => line.trim().split(" ").map(value => Number(value)))
      }
      let data = textArray.map(parse);
      this.report = zip(names, data);
    }).then(data => {
      if (this.codec == 'av2-as') {
        return this.loadConvexHulls();
      } else {
        return null;
      }
    }).then(data => {
      return this.report;
    });
  }

  loadConvexHulls(): Promise<{ [name: string]: any }> {
    // File Report
    let names = Job.sets[this.task].sources;
    let task = this.task;
    let paths = Job.sets[this.task].sources.filter(name=> {
      return name.includes('3840x2160')
    }).map(name => {
      return `/dump_convex_hull.json?a=${encodeURIComponent(this.id)}&task=${encodeURIComponent(task)}&video=${encodeURIComponent(name)}`
    });
    console.log(paths)
    return this.loadFiles(paths).then(encodedJsonArray => {
      let datas = encodedJsonArray.map(encodedJson => { return JSON.parse(encodedJson)});
      return this.convex_hulls = zip(names, datas);
    });
  }

  hasAnalyzer(): Promise<boolean> {
    return fileExists(this.decoderUrl());
  }

  hasReport(): Promise<boolean> {
    return fileExists(this.totalReportUrl());
  }

  isComparableWith(other: Job) {
    return this.task == other.task;
  }

  static fromJSON(json: any) {
    let job = new Job();
    job.id = json.run_id;
    job.nick = json.nick;
    job.qualities = json.qualities || "";
    job.buildOptions = json.build_options;
    job.codec = json.codec;
    job.commit = json.commit;
    job.extraOptions = json.extra_options;
    job.task = json.task;
    job.taskType = json.task_type;
    job.status = json.status;
    job.saveEncodedFiles = parseBoolean(json.save_encode);
    job.runABCompare = parseBoolean(json.ab_compare);
    return job;
  }

  static codecs = {
    "av1": "AV1 (libaom) Random Access (RA)",
    "av1-rt": "AV1 (libaom) Low Delay (LD)",
    "svt-av1": "AV1 (SVT-AV1) Random Access (RA)",
    "av2-ai": "AV2 (libaom) All Intra (AI)",
    "av2-ra": "AV2 (libaom) Random Access (RA) GOP parallel",
    "av2-ra-st": "AV2 (libaom) Random Access (RA)",
    "av2-ld": "AV2 (libaom) Low Delay (LD)",
    "av2-as": "AV2 (libaom) Adaptive Streaming (AS)",
    "daala": "Daala",
    "x264": "x264",
    "x265": "x265",
    "x265-rt": "x265 Realtime",
    "xvc": "xvc",
    "vp8": "VP8",
    "vp9": "VP9",
    "vp10": "VP10",
    "vp10-rt": "VP10 Realtime",
    "thor": "Thor",
    "thor-rt": "Thor Realtime",
    "rav1e": "rav1e",
    "vvc-vtm": "VVC VTM"
  };

  static sets = {};
}

export class Jobs {
  jobs: Job[] = [];
  onChange = new AsyncEvent<string>();
  constructor() {

  }
  addJobInternal(job: Job) {
    if (this.jobs.indexOf(job) >= 0) {
      return;
    }
    this.jobs.push(job);
  }
  prependJob(job: Job) {
    if (this.jobs.indexOf(job) >= 0) {
      return;
    }
    this.jobs.unshift(job);
    this.onChange.post("job-added");
  }
  addJob(job: Job) {
    if (this.jobs.indexOf(job) >= 0) {
      return;
    }
    this.jobs.push(job);
    this.onChange.post("job-added");
  }
  removeJob(job: Job) {
    let index = this.jobs.indexOf(job);
    if (index >= 0) {
      this.jobs.splice(index, 1);
      this.onChange.post("job-removed");
    }
  }
  getSelectedJobs(status = JobStatus.All): Job [] {
    return this.jobs.filter(job => (job.selected && (job.status & status))).sort((a, b) => {
      return a.selectedName.localeCompare(b.selectedName);
    });
  }
  getById(id: string) {
    for (let i = 0; i < this.jobs.length; i++) {
      if (this.jobs[i].id === id) {
        return this.jobs[i];
      }
    }
    return null;
  }
}

export function forEachUrlParameter(callback: (key: string, value: string) => void) {
  let url = window.location.search.substring(1);
  url = url.replace(/\/$/, ""); // Replace / at the end that gets inserted by browsers.
  let params = {};
  url.split('&').forEach(function (s) {
    let t = s.split('=');
    callback(t[0], decodeURIComponent(t[1]));
  });
}

export function getUrlParameters(): any {
  let params = {};
  forEachUrlParameter((key, value) => {
    params[key] = value;
  });
  return params;
};

let colorPool = [
  '#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#b15928'
];

export function hashString(s: string) {
  let hash = 0;
  if (s.length === 0) {
    return hash;
  }
  for (let i = 0; i < s.length; i++) {
    hash  = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

// MBX's color palette, hopefully nobody picks more than 10 jobs.
let colorPalette = {
  "A": "#FF4136",
  "B": "#0074D9",
  "C": "#2ECC40",
  "D": "#FFDC00",
  "E": "#85144b",
  "F": "#FF851B",
  "G": "#001f3f",
  "H": "#3D9970",
  "I": "#7FDBFF",
  "J": "#01FF70"
}

function getColorForString(s: string): string {
  if (colorPalette[s]) {
    return colorPalette[s];
  }
  let t = hashString(s);
  return colorPool[t % colorPool.length];
}

let randomColorPool = []
export function getRandomColorForString(s: string): string {
  let t = hashString(s);
  if (!randomColorPool[t]) {
    randomColorPool[t] = tinycolor.random().toString();
  }
  return randomColorPool[t];
}

let alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

function aquireSelectedName() {
  for (let i = 0; i < alphabet.length; i++) {
    if (alphabet[i].toUpperCase() != alphabet[i]) {
      alphabet[i] = alphabet[i].toUpperCase();
      return alphabet[i];
    }
  }
}

function releaseSelectedName(name: string) {
  for (let i = 0; i < alphabet.length; i++) {
    if (alphabet[i] == name) {
      alphabet[i] = name.toLowerCase();
    }
  }
}

export class AppStore {
  jobs: Jobs;
  onChange = new AsyncEvent<string>();
  aws: any;
  onAWSChange = new AsyncEvent<string>();
  analyzedFiles = [];
  onAnalyzedFilesChanged = new AsyncEvent<string>();
  isLoggedIn: boolean = false;
  password: string = "";
  onLoggedInStateChanged = new AsyncEvent<string>();
  constructor() {
    let jobs = this.jobs = new Jobs();
    this.aws = {};
    AppDispatcher.register((action) => {
      if (action instanceof SelectJob) {
        let job = action.job;
        let selectedJobs = jobs.getSelectedJobs();
        if (selectedJobs.length && !selectedJobs[0].isComparableWith(job)) {
          console.error(`Cannot select ${job.id} because it doesn't match other selected jobs.`);
          return;
        }
        job.selected = true;
        job.selectedName = aquireSelectedName();
        job.color = getColorForString(job.selectedName);
        job.onChange.post("");
        jobs.onChange.post("");
      } else if (action instanceof DeselectJob) {
        let job = action.job;
        releaseSelectedName(job.selectedName)
        job.selected = false;
        job.selectedName = "";
        job.color = "";
        job.onChange.post("");
        jobs.onChange.post("");
      } else if (action instanceof SubmitJob) {
        this.submitJob(action.job);
        jobs.onChange.post("");
      } else if (action instanceof CancelJob) {
        this.cancelJob(action.job);
        jobs.onChange.post("");
      } else if (action instanceof AnalyzeFile) {
        this.analyzedFiles.push({job: null, decoderUrl: "https://media.xiph.org/analyzer/inspect.js", videoUrl: "crosswalk_30.ivf"})
        this.onAnalyzedFilesChanged.post("change");
      }
    });
  }
  logout() {
    delete localStorage["password"];
    this.password = "";
    this.isLoggedIn = false;
    this.onLoggedInStateChanged.post("changed");
  }
  login(password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.password = password;
      postXHR(baseUrl + "submit/check", {
        key: password
      }).then((result) => {
        this.isLoggedIn = result;
        this.onLoggedInStateChanged.post("changed");
        resolve(result);
        if (result) {
          localStorage["password"] = password;
        } else {
          delete localStorage["password"];
        }
      }, () => {
        this.isLoggedIn = false;
        this.onLoggedInStateChanged.post("changed");
        reject(false);
      });
    });
  }
  submitJob(job: Job) {
    job.status = JobStatus.Unknown;
    this.jobs.prependJob(job);
    postXHR(baseUrl + "submit/job", {
      key: this.password,
      run_id: job.id,
      commit: job.commit,
      codec: job.codec,
      task: job.task,
      extra_options: job.extraOptions,
      build_options: job.buildOptions,
      qualities: job.qualities,
      nick: job.nick,
      ab_compare: job.runABCompare,
      save_encode: job.saveEncodedFiles
    });
  }
  cancelJob(job: Job) {
    job.status = JobStatus.Unknown;
    job.onChange.post("");
    this.jobs.onChange.post("");
    postXHR(baseUrl + "submit/cancel", {
      key: this.password,
      run_id: job.id,
    });
  }

  lastPoll: Date = new Date();

  poll() {
    console.info("Polling ...");
    this.loadJobs().then(() => {
      this.loadStatus();
      this.loadAWS();
      this.lastPoll = new Date();
    });
  }

  startPolling() {
    setInterval(() => {
      this.poll();
    }, 60000);
  }

  load() {
    this.loadJobs().then(() => {
      this.loadAWS();
      Promise.all([this.loadSets(), this.loadStatus()]).then(() => {
        this.processUrlParameters();
        this.updateURL();
        this.jobs.onChange.attach(this.updateURL.bind(this));
      });
      this.startPolling();
    });
    try {
      if (localStorage["password"]) {
        this.login(localStorage["password"]);
      }
    } catch (e) {
      console.log('Exception reading secret key from localstorage:', e);
    }
  }

  updateURL() {
    let baseurl = location.protocol + '//' + location.host + location.pathname + "?";
    let url = baseurl + this.jobs.getSelectedJobs().map(job => {
      return "job=" + encodeURIComponent(job.id);
    }).join("&");
    window.history.replaceState(null, null, url);
  }

  loadAWS() {
    loadXHR(baseUrl + "describeAutoScalingInstances", (json) => {
      if (!json) return;
      this.aws.AutoScalingInstances = json.AutoScalingInstances;
      this.onAWSChange.post("loaded");
    });
    loadXHR(baseUrl + "describeAutoScalingGroups", (json) => {
      if (!json) return;
      this.aws.AutoScalingGroups = json.AutoScalingGroups;
      this.onAWSChange.post("loaded");
    });
  }
  static bdRateReportCache: { [path: string]: BDRateReport } = {};
    static loadBDRateReport(a: Job, b: Job, set: string, method = "report-overlap", range="av1", interpolation="pchip-new"): Promise<BDRateReport> {
    let args = [
      "a=" + encodeURIComponent(a.id),
      "b=" + encodeURIComponent(b.id),
      "set=" + encodeURIComponent(set),
      "method=" + encodeURIComponent(method),
      "range=" + encodeURIComponent(range),
      "interpolation=" + encodeURIComponent(interpolation),
      "file=" + "REMOVEME",
      "format=json"
    ];
    let url = baseUrl + "bd_rate?" + args.join("&");
    if (AppStore.bdRateReportCache[url]) {
      let report = AppStore.bdRateReportCache[url];
      return Promise.resolve(report);
    }
    return new Promise((resolve, reject) => {
      loadXHR(url, (json) => {
        if (!json) {
          reject(null);
          return;
        }
        let report = BDRateReport.fromJSON(a, b, json);
        AppStore.bdRateReportCache[url] = report;
        resolve(report);
      })
    });
  }
  findJob(id: string): Job {
    return this.jobs.jobs.find((job) => job.id === id);
  }
  processUrlParameters() {
    forEachUrlParameter((key, value) => {
      if (key === "job") {
        let job = this.findJob(value);
        if (job) {
          AppDispatcher.dispatch(new SelectJob(job));
        }
      }
    });
  }
  loadStatus() {
    return new Promise((resolve, reject) => {
      loadXHR(baseUrl + "run_status.json", (json) => {
        if (!json) return;
        json.forEach(o => {
          let job = this.findJob(o.run_id);
          if (!job) return;
          if (job.status != JobStatus.Canceled) {
            job.status = JobStatus.Running;
            console.log("detected zombie job:",o.run_id);
          }
          job.progress.value = o.completed;
          job.progress.total = o.total;
          job.progress.eta = o.eta;
          job.loadLog(true);
          job.onChange.post("updated status");
        });
        this.jobs.onChange.post("updated status");
        resolve(true);
      });
    });
  }
  loadSets(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      loadXHR(baseUrl + "sets.json", (json) => {
        Job.sets = json;
        resolve(true);
      });
    });
  }

  loadJobs(): Promise<boolean> {
    function fromStatus(status: string): JobStatus {
      switch (status) {
        case "new":
          return JobStatus.New;
        case "building":
          return JobStatus.Building;
        case "waiting":
          return JobStatus.Waiting;
        case "running":
          return JobStatus.Running;
        case "completed":
          return JobStatus.Completed;
        case "canceled":
          return JobStatus.Canceled;
        case "failed":
          return JobStatus.Failed;
        default:
          return JobStatus.Unknown;
      }
    }
    return new Promise((resolve, reject) => {
      loadXHR(baseUrl + "list.json", (json) => {
        // json = json.filter(job => job.info.task === "objective-1-fast" && job.info.codec === "av1");
        json.sort(function (a, b) {
          return (new Date(b.date) as any) - (new Date(a.date) as any);
        });
        let changed = false;
        json = json.slice(0, 8192);
        json.forEach(o => {
          let job = this.findJob(o.run_id);
          if (job) {
            let newStatus = fromStatus(o.status);
            if (job.status !== newStatus) {
              job.status = newStatus;
              job.onChange.post("");
              changed = true;
            }
          } else {
            job = Job.fromJSON(o.info);
            job.date = new Date(o.date);
            job.status = fromStatus(o.status);
            this.jobs.addJobInternal(job);
            changed = true;
          }
        });
        if (changed) {
          this.jobs.onChange.post("");
        }
        resolve(true);
      });
    });
  }
}

export let appStore = new AppStore();
