import { Injectable } from '@nestjs/common';
import * as cluster from 'cluster';
import * as os from 'os';

const numCPUs = 8;
// const numCPUs = os.cpus().length;

@Injectable()
export class AppClusterService {
    static clusterize(callback: Function): void {
        if (cluster.isMaster) {
            console.log(`Master server started with PID: ${process.pid} Workers: ${numCPUs}`);
            for (let i = 0; i < numCPUs; i++) {
                cluster.fork();
            }
            cluster.on('exit', (worker, code, signal) => {
                console.log(`Worker ${worker.process.pid} died. Restarting`);
                cluster.fork()
            })
        } else {
            console.log(`Cluster worker PID: ${process.pid}`);
            callback();
        }
    }
}