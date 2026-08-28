import type {Job} from "../fixtures";

export type ApplicationStatus="queued"|"processing"|"sent"|"action_required"|"viewed"|"interview"|"rejected"|"failed";
export type SwipeDirection="left"|"right"|"save";
export type SubmitApplicationInput={jobId:string;answers:Record<string,unknown>;platform:"web"};
export type SubmitApplicationResult={applicationId:string;status:ApplicationStatus;actionUrl?:string;requiredFields?:string[];requestId?:string};

export interface LandeoRepository{
  listJobs(filters:Record<string,unknown>):Promise<Job[]>;
  recordSwipe(jobId:string,direction:SwipeDirection):Promise<void>;
  submitApplication(input:SubmitApplicationInput):Promise<SubmitApplicationResult>;
}

// Implement this interface only after comparing it with the generated Supabase
// types and RLS policies from the existing mobile repository.
