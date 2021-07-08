import * as React from "react";
import { Modal, Panel, Button, ProgressBar, ButtonToolbar, DropdownButton } from "react-bootstrap";
import { hashString, appStore, AppDispatcher, SelectJob, DeselectJob, CancelJob, SubmitJob, Jobs, Job, JobStatus, JobProgress, timeSince, minutesSince } from "../stores/Stores";
import { SubmitJobFormComponent } from "./SubmitJobForm";

interface JobProps {
  job: Job;
  disabled?: boolean;
  detailed?: boolean;
  onCancel?: (job: Job) => void;
}

export class JobComponent extends React.Component<JobProps, {
    job: Job;
    showCancelModal: boolean;
    showSubmitJobForm: boolean;
    hasReport: undefined | boolean;
    hasAnalyzer: undefined | boolean;
    detailed: boolean;
  }> {

  onChangeHandler: any;
  constructor(props: JobProps) {
    super();
    this.state = {
      job: props.job,
      showCancelModal: false,
      showSubmitJobForm: false,
      hasReport: undefined,
      hasAnalyzer: undefined,
      detailed: props.detailed
    };
    this.onChangeHandler = () => {
      this.forceUpdate();
    };
  }
  componentWillMount() {
    this.props.job.onChange.attach(this.onChangeHandler);
  }
  componentWillUnmount() {
    this.props.job.onChange.detach(this.onChangeHandler);
  }
  onCancelClick() {
    this.setState({ showCancelModal: true } as any);
  }
  onToggleSelectionClick() {
    let job = this.state.job;
    if (job.selected) {
      AppDispatcher.dispatch(new DeselectJob(this.state.job));
    } else {
      AppDispatcher.dispatch(new SelectJob(this.state.job));
    }
    // Check analyzer and report status.
    job.hasAnalyzer().then(result => {
      this.setState({hasAnalyzer: result} as any);
    });
    // job.hasReport().then(result => {
    //   this.setState({hasReport: result} as any);
    // });
  }
  abortCancel() {
    this.setState({ showCancelModal: false } as any);
  }
  confirmCancel() {
    this.abortCancel();
    this.props.onCancel(this.state.job);
  }
  toggleDetail() {
    this.setState({detailed: !this.state.detailed} as any);
  }
  hideSubmitJobForm() {
    this.setState({ showSubmitJobForm: false } as any);
  }
  onSubmitJob(job: Job) {
    this.hideSubmitJobForm();
    AppDispatcher.dispatch(new SubmitJob(job));
  }
  onRerunClick() {
    this.setState({ showSubmitJobForm: true } as any);
  }
  render() {
    let job = this.props.job;
    let progress = null;
    if (job.status & JobStatus.Cancelable) {
      let value = job.progress.total ? job.progress.value / job.progress.total : 0;
      let label = `${job.progress.value} of ${job.progress.total}`;
      let remaining = Math.round(job.progress.eta / 60);
      label += " (" + remaining + "m left)";
      let now = value > 0 ? 100 * value : 100;
      if (value === 0) {
        progress = <ProgressBar bsStyle="warning" label={JobStatus[job.status]} now={100}/>
      } else {
        progress = <ProgressBar active now={now} label={label}/>
      }
    }
    let cancel = null;
    let select = null;
    if (job.status & JobStatus.Cancelable) {
      if (this.props.onCancel) {
        cancel = <Button bsSize="small" bsStyle="danger" disabled={!appStore.isLoggedIn} onClick={this.onCancelClick.bind(this)}>Cancel</Button>;
      }
    }
    select = <Button disabled={this.props.disabled} bsSize="small" onClick={this.onToggleSelectionClick.bind(this)}>{job.selected ? "Deselect " + job.selectedName : "Select"}</Button>
    let jobStatus = null;
    if (job.status !== JobStatus.Completed) {
      jobStatus = <div className="jobWarning">Job {JobStatus[job.status]}.</div>
    }
    let hasAnalyzer = null;
    if (this.state.hasAnalyzer !== undefined) {
      if (this.state.hasAnalyzer === false && job.codec == 'av1') {
        hasAnalyzer = <div className="jobWarning">Analyzer failed to build.</div>
      }
    }
    // let hasReport = null;
    // if (this.state.hasReport !== undefined) {
    //   if (this.state.hasReport === false) {
    //     hasReport = <div className="jobWarning">Report failed to build or is not yet available.</div>
    //   }
    // }
    let date = job.date ? `${timeSince(job.date)}`: "";

    let borderRight = job.selected ? "4px solid " + job.color : undefined;
    let borderLeft = borderRight;
    let backgroundColor = (job.buildOptions === "" && job.extraOptions === "") ? "#FBFBFB": "";
    if (job.selected) {
      backgroundColor = "#F0F0F0";
    }
    if (job.status == JobStatus.Canceled || job.status == JobStatus.Unknown) {
      backgroundColor = "#fcf6ed";
    } else if (job.status == JobStatus.Failed) {
      backgroundColor = "#fff4f4";
    } else if (job.buildOptions == "") {
      backgroundColor = "#eaffea";
    }
    function keyValue(key, value) {
      return <div key={key}><span className="tinyJobValue">{key}: </span><span className="tinyGrayJobValue">{String(value)}</span></div>
    }

    let details = [];
    if (this.state.detailed) {
      if (job.extraOptions) details.push(keyValue("Extra", job.extraOptions));
      if (job.buildOptions) details.push(keyValue("Build", job.buildOptions));
      details.push(keyValue("Codec", job.codec));
      details.push(keyValue("Commit", job.commit));
      details.push(keyValue("Task", job.task));
      details.push(keyValue("Qualities", job.qualities));
      details.push(keyValue("Run A/B Compare", job.runABCompare));
      details.push(keyValue("Save Encoded Files", job.saveEncodedFiles));
      details.push(keyValue("Status", JobStatus[job.status]));
    }
    let award = null;
    // let src = ["img/bottle.png", "img/mug.png", "img/beer.png"][hashString(job.commit) % 3];
    // award = <div style={{paddingRight: "10px", display: "flex", justifyContent: "center"}}><img src={src} style={{height: 32, padding: 2}}/></div>

    return <div className="list-group-item job" style={{ borderRight, borderLeft, backgroundColor}}>
      <Modal show={this.state.showCancelModal} onHide={this.abortCancel.bind(this)}>
        <Modal.Header closeButton>
          <Modal.Title>Cancel job?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>Are you sure you want to cancel {this.state.job.id}?</h5>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.confirmCancel.bind(this)}>Yes</Button>
          <Button onClick={this.abortCancel.bind(this)}>No</Button>
        </Modal.Footer>
      </Modal>
      {hasAnalyzer}
      {progress}
      <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
        {award}
        <div style={{paddingRight: "4px", flex: "1"}}>
          <div className="jobValue">{job.id} <Button className="expander" onClick={this.toggleDetail.bind(this)}>...</Button></div>
          <div className="tinyJobValue">
            {job.nick} <span className="tinyGrayJobValue">submitted {date}</span>
          </div>
          {details}
          { this.state.detailed ? <div className="jobButtons" ><Button bsSize="xsmall" disabled={!appStore.isLoggedIn} onClick={this.onRerunClick.bind(this)}>Clone</Button></div> : null }
        </div>
        <div>
          {cancel}{' '}
          {select}
        </div>
      </div>
      { this.state.showSubmitJobForm ? <SubmitJobFormComponent template={job} onCreate={this.onSubmitJob.bind(this)} onCancel={this.hideSubmitJobForm.bind(this)} /> : null }
    </div>
  }
}
